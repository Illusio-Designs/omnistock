const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// ── Seed accounts (overridable via .env) ───────────────────────────
const PLATFORM_ADMIN_EMAIL    = process.env.PLATFORM_ADMIN_EMAIL    || 'founder@omnistock.com';
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'founder123';
const PLATFORM_ADMIN_NAME     = process.env.PLATFORM_ADMIN_NAME     || 'Platform Founder';

const DEMO_TENANT_SLUG   = process.env.DEMO_TENANT_SLUG   || 'demo';
const DEMO_TENANT_NAME   = process.env.DEMO_TENANT_NAME   || 'OmniStock Demo Co';
const DEMO_ADMIN_EMAIL   = process.env.DEMO_ADMIN_EMAIL   || 'admin@omnistock.com';
const DEMO_ADMIN_PASSWORD= process.env.DEMO_ADMIN_PASSWORD|| 'admin123';
const DEMO_ADMIN_NAME    = process.env.DEMO_ADMIN_NAME    || 'Admin User';

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

// ───────────────────────────────────────────────
// SYSTEM ROLE TEMPLATES (per tenant)
// ───────────────────────────────────────────────
function rolePermissionsForTemplate(code, allCodes) {
  switch (code) {
    case 'ADMIN':
      return allCodes; // everything
    case 'MANAGER':
      return allCodes.filter(c =>
        !c.startsWith('billing.') &&
        !c.startsWith('roles.') &&
        !c.endsWith('.delete')
      );
    case 'STAFF':
      return allCodes.filter(c =>
        c.endsWith('.read') ||
        c === 'orders.create' || c === 'orders.fulfill' ||
        c === 'inventory.adjust' || c === 'shipments.create'
      );
    case 'ACCOUNTANT':
      return allCodes.filter(c =>
        c.startsWith('invoices.') ||
        c.startsWith('reports.') ||
        c === 'orders.read' || c === 'purchases.read' ||
        c === 'billing.read'
      );
    default:
      return [];
  }
}

const SYSTEM_ROLE_TEMPLATES = [
  { code: 'ADMIN',       name: 'Admin',       description: 'Full tenant access' },
  { code: 'MANAGER',     name: 'Manager',     description: 'Operations management' },
  { code: 'STAFF',       name: 'Staff',       description: 'Day-to-day staff' },
  { code: 'ACCOUNTANT',  name: 'Accountant',  description: 'Finance & invoices' },
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

async function seedSystemRolesForTenant(tenantId, allPermCodes) {
  const permByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map(p => [p.code, p.id])
  );
  for (const tpl of SYSTEM_ROLE_TEMPLATES) {
    const role = await prisma.tenantRole.upsert({
      where: { tenantId_code: { tenantId, code: tpl.code } },
      update: { name: tpl.name, description: tpl.description, isSystem: true },
      create: { tenantId, code: tpl.code, name: tpl.name, description: tpl.description, isSystem: true },
    });
    const codes = rolePermissionsForTemplate(tpl.code, allPermCodes);
    for (const code of codes) {
      const pid = permByCode[code];
      if (!pid) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
        update: {},
        create: { roleId: role.id, permissionId: pid },
      });
    }
  }
}

async function main() {
  console.log('Seeding database…');

  const allPermCodes = await seedPermissions();
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

  // ── Default demo tenant on Professional plan ────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {},
    create: {
      slug: DEMO_TENANT_SLUG,
      businessName: DEMO_TENANT_NAME,
      ownerEmail: DEMO_ADMIN_EMAIL,
      ownerName: DEMO_ADMIN_NAME,
      country: 'IN',
      industry: 'Retail',
      status: 'ACTIVE',
    },
  });
  console.log('Tenant:', tenant.slug);

  await seedSystemRolesForTenant(tenant.id, allPermCodes);

  const proPlan = await prisma.plan.findUnique({ where: { code: 'PROFESSIONAL' } });
  const now = new Date();
  const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      payAsYouGo: true,
    },
  });

  // ── Tenant admin user ──────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {
      tenantId: tenant.id,
      password: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
      name: DEMO_ADMIN_NAME,
    },
    create: {
      name: DEMO_ADMIN_NAME,
      email: DEMO_ADMIN_EMAIL,
      password: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
      role: 'ADMIN',
      tenantId: tenant.id,
      emailVerified: true,
    },
  });
  const adminRole = await prisma.tenantRole.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ADMIN' } },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('Tenant admin:', adminUser.email);

  // ── One user per role template (for dev-mode role testing) ──────
  const ROLE_USERS = [
    { code: 'MANAGER',    email: 'manager@omnistock.com',    name: 'Manager User',    coarse: 'MANAGER' },
    { code: 'STAFF',      email: 'staff@omnistock.com',      name: 'Staff User',      coarse: 'STAFF' },
    { code: 'ACCOUNTANT', email: 'accountant@omnistock.com', name: 'Accountant User', coarse: 'ACCOUNTANT' },
  ];
  const devPasswordHash = await bcrypt.hash('dev123', 12);
  for (const ru of ROLE_USERS) {
    const u = await prisma.user.upsert({
      where: { email: ru.email },
      update: { tenantId: tenant.id, name: ru.name, role: ru.coarse },
      create: {
        name: ru.name,
        email: ru.email,
        password: devPasswordHash,
        role: ru.coarse,
        tenantId: tenant.id,
        emailVerified: true,
      },
    });
    const tRole = await prisma.tenantRole.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: ru.code } },
    });
    if (tRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: tRole.id } },
        update: {},
        create: { userId: u.id, roleId: tRole.id },
      });
    }
    console.log(`Role user (${ru.code}):`, u.email);
  }

  // ── Demo business data (tenant-scoped) ──────────────────────────
  const wh1 = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-MUMBAI' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Mumbai Warehouse', code: 'WH-MUMBAI', address: { line1: '123 Dharavi Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400017', country: 'India' } },
  });
  await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-DELHI' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Delhi Warehouse', code: 'WH-DELHI', address: { line1: '45 Connaught Place', city: 'Delhi', state: 'Delhi', pincode: '110001', country: 'India' } },
  });

  await prisma.channel.createMany({
    data: [
      { tenantId: tenant.id, name: 'Amazon India', type: 'AMAZON' },
      { tenantId: tenant.id, name: 'Flipkart',     type: 'FLIPKART' },
      { tenantId: tenant.id, name: 'Own Website',  type: 'WEBSITE' },
      { tenantId: tenant.id, name: 'Offline Store', type: 'OFFLINE' },
    ],
    skipDuplicates: true,
  });

  const cat = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Electronics' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Electronics' },
  });

  const brand = await prisma.brand.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'TechCo' } },
    update: {},
    create: { tenantId: tenant.id, name: 'TechCo' },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'PHONE-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Wireless Earbuds Pro',
      sku: 'PHONE-001',
      description: 'Premium wireless earbuds with noise cancellation',
      categoryId: cat.id,
      brandId: brand.id,
      weight: 0.05,
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'PHONE-001-BLK' } },
    update: {},
    create: {
      tenantId: tenant.id,
      productId: product.id,
      sku: 'PHONE-001-BLK',
      name: 'Black',
      attributes: { color: 'Black' },
      costPrice: 1200,
      mrp: 2999,
      sellingPrice: 2499,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { warehouseId_variantId: { warehouseId: wh1.id, variantId: variant.id } },
    update: {},
    create: { tenantId: tenant.id, warehouseId: wh1.id, variantId: variant.id, productId: product.id, quantityOnHand: 150, quantityAvailable: 150, reorderPoint: 20 },
  });

  await prisma.vendor.create({
    data: { tenantId: tenant.id, name: 'Global Supplies Ltd', email: 'supply@globalsupplies.com', phone: '+91-9876543210', gstin: '27ABCDE1234F1Z5', address: { city: 'Mumbai' }, paymentTerms: 'Net 30' },
  }).catch(() => {});

  await prisma.customer.create({
    data: { tenantId: tenant.id, name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91-9999999999', address: { line1: '12 MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' } },
  }).catch(() => null);

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

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
