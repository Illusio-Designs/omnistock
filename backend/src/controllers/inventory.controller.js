const { z } = require('zod');
const prisma = require('../utils/prisma');
const { notifyTenant } = require('../services/notifications.service');

const LOW_STOCK_THRESHOLD = 10;

const adjustSchema = z.object({
  warehouseId: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT']),
  notes: z.string().optional(),
});

const tid = (req) => req.tenant.id;

const getInventory = async (req, res) => {
  try {
    const { warehouseId, lowStock, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId: tid(req) };
    if (warehouseId) where.warehouseId = String(warehouseId);
    if (lowStock === 'true') where.quantityAvailable = { lte: 10 };

    const items = await prisma.inventoryItem.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        warehouse: true,
        variant: { include: { product: true } },
      },
      orderBy: { variant: { product: { name: 'asc' } } },
    });
    const total = await prisma.inventoryItem.count({ where });
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

const adjustInventory = async (req, res) => {
  try {
    const data = adjustSchema.parse(req.body);
    const tenantId = tid(req);

    // Verify the warehouse + variant belong to this tenant
    const [wh, variant] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } }),
      prisma.productVariant.findFirst({ where: { id: data.variantId, tenantId }, select: { id: true, productId: true } }),
    ]);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    // Capture the pre-tx quantity so the low-stock check below can see
    // whether this adjustment crossed the threshold.
    const beforeRow = await prisma.inventoryItem.findUnique({
      where: { warehouseId_variantId: { warehouseId: data.warehouseId, variantId: data.variantId } },
    });

    await prisma.$transaction(async (tx) => {
      const existing = beforeRow;
      const qty = data.type === 'OUTBOUND' ? -Math.abs(data.quantity) : Math.abs(data.quantity);

      if (existing) {
        await tx.inventoryItem.update({
          where: { warehouseId_variantId: { warehouseId: data.warehouseId, variantId: data.variantId } },
          data: { quantityOnHand: { increment: qty }, quantityAvailable: { increment: qty } },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            tenantId,
            warehouseId: data.warehouseId,
            variantId: data.variantId,
            productId: variant.productId,
            quantityOnHand: Math.max(0, qty),
            quantityAvailable: Math.max(0, qty),
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          tenantId,
          warehouseId: data.warehouseId,
          variantId: data.variantId,
          type: data.type,
          quantity: data.quantity,
          notes: data.notes,
          referenceType: 'ADJUSTMENT',
        },
      });
    });

    // Fire a low-stock notification when an OUTBOUND/ADJUSTMENT crosses
    // the threshold from above. Re-read post-tx so the row reflects the
    // committed quantity.
    if (data.type !== 'INBOUND') {
      try {
        const after = await prisma.inventoryItem.findUnique({
          where: { warehouseId_variantId: { warehouseId: data.warehouseId, variantId: data.variantId } },
          include: { variant: { include: { product: true } }, warehouse: true },
        });
        const before = (beforeRow?.quantityAvailable ?? 0);
        const now = after?.quantityAvailable ?? 0;
        if (after && before > LOW_STOCK_THRESHOLD && now <= LOW_STOCK_THRESHOLD) {
          notifyTenant(tenantId, {
            type: now <= 0 ? 'inventory.out_of_stock' : 'inventory.low',
            category: 'inventory',
            severity: now <= 0 ? 'error' : 'warning',
            title: now <= 0
              ? `${after.variant?.product?.name || 'Item'} is out of stock`
              : `Low stock: ${after.variant?.product?.name || 'Item'} (${now} left)`,
            body: `Warehouse: ${after.warehouse?.name || '—'} · SKU ${after.variant?.sku || '—'}`,
            link: '/inventory?lowStock=true',
            metadata: { variantId: data.variantId, warehouseId: data.warehouseId, qty: now },
          });
        }
      } catch (e) { /* low-stock notify is best-effort */ }
    }

    res.json({ message: 'Inventory adjusted' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    console.error(err);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
};

const getLowStockItems = async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId: tid(req), quantityAvailable: { lte: 10 } },
      include: { warehouse: true, variant: { include: { product: true } } },
      orderBy: { quantityAvailable: 'asc' },
      take: limit,
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const { warehouseId, variantId, type, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId: tid(req) };
    if (warehouseId) where.warehouseId = String(warehouseId);
    if (variantId) where.variantId = String(variantId);
    if (type) where.type = String(type);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({ where, skip, take: Number(limit), include: { warehouse: true }, orderBy: { createdAt: 'desc' } }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({ movements, total, page: Number(page), limit: Number(limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

module.exports = { getInventory, adjustInventory, getLowStockItems, getStockMovements };
