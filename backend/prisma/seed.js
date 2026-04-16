const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = require('../src/utils/prisma');

// ── Seed accounts (overridable via .env) ───────────────────────────
const PLATFORM_ADMIN_EMAIL    = process.env.PLATFORM_ADMIN_EMAIL    || 'founder@omnistock.com';
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'founder123';
const PLATFORM_ADMIN_NAME     = process.env.PLATFORM_ADMIN_NAME     || 'Platform Founder';

// ───────────────────────────────────────────────
// PERMISSION CATALOG (modules × actions)
// ───────────────────────────────────────────────
const MODULES = {
  products:   ['read', 'create', 'update', 'delete'],
  inventory:  ['read', 'create', 'update', 'delete', 'adjust'],
  orders:     ['read', 'create', 'update', 'delete', 'fulfill', 'cancel'],
  purchases:  ['read', 'create', 'update', 'delete', 'approve'],
  vendors:    ['read', 'create', 'update', 'delete'],
  customers:  ['read', 'create', 'update', 'delete'],
  warehouses: ['read', 'create', 'update', 'delete'],
  channels:   ['read', 'create', 'update', 'delete', 'sync'],
  invoices:   ['read', 'create', 'update', 'delete'],
  reports:    ['read', 'export'],
  returns:    ['read', 'create', 'update', 'approve'],
  shipments:  ['read', 'create', 'update'],
  billing:    ['read', 'manage'],
  users:      ['read', 'create', 'update', 'delete', 'invite'],
  roles:      ['read', 'create', 'update', 'delete'],
  settings:   ['read', 'update'],
};

function buildPermissionCodes() {
  const out = [];
  for (const [mod, actions] of Object.entries(MODULES)) {
    for (const a of actions) out.push({ code: `${mod}.${a}`, module: mod });
  }
  return out;
}

// ───────────────────────────────────────────────
// PLAN CATALOG (matches the public pricing page)
// ───────────────────────────────────────────────
const PLANS = [
  {
    code: 'STANDARD',
    name: 'Standard',
    tagline: 'Suitable for Micro-businesses that require basic automation to manage operations.',
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    sortOrder: 1,
    maxFacilities: 1,
    maxSkus: 100000,
    maxUserRoles: 3,
    maxUsers: 5,
    maxOrdersPerMonth: 5000,
    features: {
      returns: 'basic',
      vms: true,
      paymentReconciliation: true,
      mobileApp: true,
      purchaseManagement: false,
      barcoding: false,
      inwardLogistics: false,
      customReports: false,
      apiIntegration: false,
      advancedWarehouseOps: false,
      vendorManagement: false,
      omniChannel: false,
      erpIntegration: false,
    },
    meteredRates: { extraOrders: 0.5, extraSkus: 0.1, extraFacilities: 999 },
  },
  {
    code: 'PROFESSIONAL',
    name: 'Professional',
    tagline: 'Suitable for growing businesses that are striving to strengthen operational capabilities.',
    monthlyPrice: 7499,
    yearlyPrice: 74990,
    sortOrder: 2,
    maxFacilities: 2,
    maxSkus: 300000,
    maxUserRoles: 9,
    maxUsers: 20,
    maxOrdersPerMonth: 25000,
    features: {
      returns: 'enhanced',
      vms: true,
      paymentReconciliation: true,
      mobileApp: true,
      purchaseManagement: true,
      barcoding: 'sku',
      inwardLogistics: true,
      customReports: false,
      apiIntegration: false,
      advancedWarehouseOps: false,
      vendorManagement: false,
      omniChannel: false,
      erpIntegration: false,
    },
    meteredRates: { extraOrders: 0.4, extraSkus: 0.08, extraFacilities: 1499 },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    tagline: 'Suitable for Large-scale businesses that require robust and power-packed features.',
    monthlyPrice: 19999,
    yearlyPrice: 199990,
    sortOrder: 3,
    maxFacilities: null,
    maxSkus: null,
    maxUserRoles: null,
    maxUsers: null,
    maxOrdersPerMonth: null,
    features: {
      returns: 'customized',
      vms: true,
      paymentReconciliation: true,
      mobileApp: true,
      purchaseManagement: true,
      barcoding: 'item',
      inwardLogistics: true,
      customReports: true,
      apiIntegration: true,
      advancedWarehouseOps: true,
      vendorManagement: true,
      omniChannel: true,
      erpIntegration: true,
    },
    meteredRates: { extraOrders: 0.3, extraSkus: 0.05, extraFacilities: 2499 },
  },
];

async function seedPermissions() {
  const codes = buildPermissionCodes();
  for (const p of codes) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module },
      create: { code: p.code, module: p.module },
    });
  }
  console.log(`Seeded ${codes.length} permissions`);
  return codes.map(c => c.code);
}

async function seedPlans() {
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name, tagline: p.tagline, monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice, sortOrder: p.sortOrder,
        maxFacilities: p.maxFacilities, maxSkus: p.maxSkus,
        maxUserRoles: p.maxUserRoles, maxUsers: p.maxUsers,
        maxOrdersPerMonth: p.maxOrdersPerMonth,
        features: p.features, meteredRates: p.meteredRates,
      },
      create: p,
    });
  }
  console.log(`Seeded ${PLANS.length} plans`);
}

async function main() {
  console.log('Seeding database…');

  await seedPermissions();
  await seedPlans();

  // ── Platform super admin (SaaS founder) ─────────────────────────
  const platformAdmin = await prisma.user.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL },
    update: {
      isPlatformAdmin: true,
      password: await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 12),
      name: PLATFORM_ADMIN_NAME,
    },
    create: {
      name: PLATFORM_ADMIN_NAME,
      email: PLATFORM_ADMIN_EMAIL,
      password: await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 12),
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      emailVerified: true,
    },
  });
  console.log('Platform admin:', platformAdmin.email);

  // ── Default SEO settings + sample blog post ─────────────────────
  await prisma.seoSetting.upsert({
    where: { path: '/' },
    update: {},
    create: {
      path: '/',
      title: 'OmniStock — Multi-channel Inventory & Order Management',
      description: 'OmniStock is an EasyEcom-style ERP for D2C, marketplaces and warehouses. Manage inventory, orders, returns and reconciliation in one place.',
      keywords: 'inventory management, OMS, WMS, multi-channel, returns, reconciliation',
      ogTitle: 'OmniStock — Run your entire ecommerce backend',
      robots: 'index,follow',
    },
  });
  await prisma.seoSetting.upsert({
    where: { path: '/pricing' },
    update: {},
    create: {
      path: '/pricing',
      title: 'Pricing — OmniStock',
      description: 'Standard, Professional and Enterprise plans. Pay-as-you-go available.',
      robots: 'index,follow',
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: 'welcome-to-omnistock' },
    update: {},
    create: {
      slug: 'welcome-to-omnistock',
      title: 'Welcome to OmniStock',
      excerpt: 'A quick tour of what OmniStock can do for your ecommerce operations.',
      content: '# Welcome\n\nOmniStock helps you run inventory, orders and returns across every channel.',
      authorName: 'OmniStock Team',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      metaTitle: 'Welcome to OmniStock',
      metaDescription: 'Quick tour of OmniStock features.',
    },
  });

  console.log('Seed completed!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => { prisma.$disconnect(); });
