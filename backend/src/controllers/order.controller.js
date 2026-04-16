const { z } = require('zod');
const prisma = require('../utils/prisma');

const orderItemSchema = z.object({
  variantId: z.string(),
  qty: z.number().min(1),
  unitPrice: z.number(),
  discount: z.number().optional().default(0),
  tax: z.number().optional().default(0),
});

const createOrderSchema = z.object({
  channelId: z.string(),
  channelOrderId: z.string().optional(),
  customerId: z.string(),
  warehouseId: z.string().optional(),
  shippingAddress: z.any(),
  billingAddress: z.any().optional(),
  paymentMethod: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  discount: z.number().optional().default(0),
  shippingCharge: z.number().optional().default(0),
  tax: z.number().optional().default(0),
  notes: z.string().optional(),
});

const tid = (req) => req.tenant.id;
const generateOrderNumber = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getOrders = async (req, res) => {
  try {
    const { page = '1', limit = '20', status, channelId, search, risk, needsApproval, fulfillment, completeness } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId: tid(req) };
    if (status) where.status = String(status);
    if (channelId) where.channelId = String(channelId);
    if (search) where.orderNumber = { contains: String(search) };
    if (risk) where.rtoRiskLevel = String(risk).toUpperCase();
    if (needsApproval === 'true') where.needsApproval = true;
    else if (needsApproval === 'false') where.needsApproval = false;
    if (fulfillment) where.fulfillmentType = String(fulfillment).toUpperCase();
    if (completeness) where.dataCompleteness = String(completeness).toUpperCase();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: Number(limit),
        include: { channel: true, customer: true, items: { include: { variant: { include: { product: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
      include: { channel: true, customer: true, warehouse: true, items: { include: { variant: { include: { product: true } } } }, invoices: true, returns: true },
    });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const createOrder = async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const tenantId = tid(req);

    // Verify channel + customer (and warehouse if provided) belong to tenant
    const [channel, customer, wh] = await Promise.all([
      prisma.channel.findFirst({ where: { id: data.channelId, tenantId } }),
      prisma.customer.findFirst({ where: { id: data.customerId, tenantId } }),
      data.warehouseId ? prisma.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } }) : null,
    ]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (data.warehouseId && !wh) return res.status(404).json({ error: 'Warehouse not found' });

    // Verify all variants belong to tenant
    const variantIds = data.items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, tenantId },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      return res.status(400).json({ error: 'One or more variants do not belong to your tenant' });
    }

    const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.qty - (i.discount || 0), 0);
    const total = subtotal + (data.shippingCharge || 0) + (data.tax || 0) - (data.discount || 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          orderNumber: generateOrderNumber(),
          channelId: data.channelId,
          channelOrderId: data.channelOrderId,
          customerId: data.customerId,
          warehouseId: data.warehouseId,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          paymentMethod: data.paymentMethod,
          subtotal,
          discount: data.discount || 0,
          shippingCharge: data.shippingCharge || 0,
          tax: data.tax || 0,
          total,
          notes: data.notes,
          createdById: req.user?.id,
          items: {
            create: data.items.map((item) => ({
              tenantId,
              variantId: item.variantId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              tax: item.tax || 0,
              total: item.unitPrice * item.qty - (item.discount || 0) + (item.tax || 0),
            })),
          },
        },
        include: { items: true },
      });

      // Increment monthly orders usage meter for billing / PAYG
      const period = new Date().toISOString().slice(0, 7);
      await tx.usageMeter.upsert({
        where: { tenantId_metric_period: { tenantId, metric: 'orders', period } },
        update: { count: { increment: 1 } },
        create: { tenantId, metric: 'orders', period, count: 1 },
      });

      return created;
    });
    res.status(201).json(order);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status, trackingNumber, courierName } = req.body;
    const update = { status };
    if (status === 'SHIPPED') { update.shippedAt = new Date(); update.trackingNumber = trackingNumber; update.courierName = courierName; }
    if (status === 'DELIVERED') update.deliveredAt = new Date();
    const order = await prisma.order.update({ where: { id: req.params.id }, data: update });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus, cancelOrder };
