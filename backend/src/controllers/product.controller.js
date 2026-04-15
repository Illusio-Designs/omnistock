const { z } = require('zod');
const prisma = require('../utils/prisma');

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.any().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const variantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  attributes: z.record(z.string()),
  costPrice: z.number(),
  mrp: z.number(),
  sellingPrice: z.number(),
  weight: z.number().optional(),
});

const tenantId = (req) => req.tenant?.id;

const getProducts = async (req, res) => {
  try {
    const { page = '1', limit = '20', search, categoryId, brandId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId: tenantId(req), isActive: true };
    if (search) where.OR = [{ name: { contains: String(search) } }, { sku: { contains: String(search) } }];
    if (categoryId) where.categoryId = String(categoryId);
    if (brandId) where.brandId = String(brandId);

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: Number(limit), include: { category: true, brand: true, variants: true }, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: tenantId(req) },
      include: { category: true, brand: true, variants: true, inventoryItems: { include: { warehouse: true } } },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const createProduct = async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: { ...data, tenantId: tenantId(req) },
      include: { category: true, brand: true },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const data = productSchema.partial().parse(req.body);
    // verify ownership
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tenantId(req) } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true, brand: true, variants: true },
    });
    res.json(product);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tenantId(req) } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Product deactivated' });
  } catch {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

const addVariant = async (req, res) => {
  try {
    const data = variantSchema.parse(req.body);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: tenantId(req) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variant = await prisma.productVariant.create({
      data: { ...data, productId: product.id, tenantId: tenantId(req) },
    });
    res.status(201).json(variant);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    if (err.code === 'P2002') return res.status(409).json({ error: 'Variant SKU already exists' });
    res.status(500).json({ error: 'Failed to add variant' });
  }
};

const getCategories = async (req, res) => {
  try {
    const cats = await prisma.category.findMany({
      where: { tenantId: tenantId(req) },
      include: { children: true },
    });
    res.json(cats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({ where: { tenantId: tenantId(req) } });
    res.json(brands);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addVariant, getCategories, getBrands };
