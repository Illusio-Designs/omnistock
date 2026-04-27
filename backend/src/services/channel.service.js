const prisma = require('../utils/prisma');
const { decryptCredentials } = require('../utils/crypto');
const { pickBestWarehouse } = require('./routing.service');
const { scoreOrder } = require('./rto.service');
const { resolveFulfillmentType, assessCompleteness } = require('./fulfillment.service');

// ── Adapters grouped by category ────────────────────────────────────────────

const {
  AmazonAdapter,
  FlipkartAdapter,
  MeeshoAdapter,
  MyntraAdapter,
  NykaaAdapter,
  AjioAdapter,
  TataCliqAdapter,
  SnapdealAdapter,
  GlowRoadAdapter,
  JioMartAdapter,
  PaytmMallAdapter,
  LimeRoadAdapter,
  EbayAdapter,
  EtsyAdapter,
} = require('./channels/ecom');

const {
  BlinkitAdapter,
  ZeptoAdapter,
  SwiggyInstamartAdapter,
  BBNowAdapter,
} = require('./channels/quickcom');

const {
  ShiprocketAdapter,
  DelhiveryAdapter,
  FshipAdapter,
  EcomExpressAdapter,
  XpressbeesAdapter,
  ShadowfaxAdapter,
  BlueDartAdapter,
  DTDCAdapter,
  FedExAdapter,
  DHLAdapter,
  UPSAdapter,
  IThinkAdapter,
  PickrrAdapter,
  ShipwayAdapter,
  NimbusPostAdapter,
  ClickPostAdapter,
} = require('./channels/logistics');

const {
  ShopifyAdapter,
  WooCommerceAdapter,
  AmazonSmartBizAdapter,
  MagentoAdapter,
  BigCommerceAdapter,
  OpenCartAdapter,
  CustomWebhookAdapter,
} = require('./channels/ownstore');

const {
  InstagramAdapter,
  FacebookAdapter,
  WhatsAppBusinessAdapter,
} = require('./channels/social');

const { ManualAdapter } = require('./channels/manual');

// Channels with no external API — backed by ManualAdapter (no-op).
const MANUAL_TYPES = new Set(['OFFLINE', 'POS', 'WHOLESALE', 'DISTRIBUTOR', 'OTHER']);

// ── Channel type → category map ──────────────────────────────────────────────

const CHANNEL_CATEGORY = {
  // ECOM — Indian marketplaces
  AMAZON: 'ECOM', FLIPKART: 'ECOM', MYNTRA: 'ECOM', MEESHO: 'ECOM',
  SNAPDEAL: 'ECOM', PAYTM_MALL: 'ECOM', NYKAA: 'ECOM', AJIO: 'ECOM',
  TATA_CLIQ: 'ECOM', GLOWROAD: 'ECOM', JIOMART: 'ECOM',
  LIMEROAD: 'ECOM', EBAY: 'ECOM', ETSY: 'ECOM',

  // QUICKCOM — 10-min delivery
  BLINKIT: 'QUICKCOM', ZEPTO: 'QUICKCOM',
  SWIGGY_INSTAMART: 'QUICKCOM', BB_NOW: 'QUICKCOM',

  // LOGISTICS — shipping aggregators & couriers
  SHIPROCKET: 'LOGISTICS', DELHIVERY: 'LOGISTICS', FSHIP: 'LOGISTICS',
  BLUEDART: 'LOGISTICS', DTDC: 'LOGISTICS', ECOMEXPRESS: 'LOGISTICS',
  XPRESSBEES: 'LOGISTICS', SHADOWFAX: 'LOGISTICS',
  FEDEX: 'LOGISTICS', DHL: 'LOGISTICS', UPS: 'LOGISTICS', ITHINK: 'LOGISTICS',
  PICKRR: 'LOGISTICS', SHIPWAY: 'LOGISTICS', NIMBUSPOST: 'LOGISTICS', CLICKPOST: 'LOGISTICS',

  // OWNSTORE — own website / store platforms
  AMAZON_SMARTBIZ: 'OWNSTORE',
  SHOPIFY: 'OWNSTORE', WOOCOMMERCE: 'OWNSTORE', MAGENTO: 'OWNSTORE',
  BIGCOMMERCE: 'OWNSTORE', OPENCART: 'OWNSTORE',
  WEBSITE: 'OWNSTORE', OFFLINE: 'OWNSTORE', POS: 'OWNSTORE',

  // SOCIAL
  INSTAGRAM: 'SOCIAL', FACEBOOK: 'SOCIAL', WHATSAPP_BUSINESS: 'SOCIAL',

  // B2B
  B2B_PORTAL: 'B2B', WHOLESALE: 'B2B', DISTRIBUTOR: 'B2B',

  // CUSTOM
  CUSTOM_WEBHOOK: 'CUSTOM', OTHER: 'CUSTOM',
};

function getCategoryForType(type) {
  return CHANNEL_CATEGORY[type] || 'CUSTOM';
}

// ── Adapter factory ──────────────────────────────────────────────────────────

function getAdapter(channel) {
  let creds = channel.credentials;

  // Manual channels (OFFLINE/POS/WHOLESALE/DISTRIBUTOR/OTHER) need no
  // credentials — return a no-op adapter immediately.
  if (MANUAL_TYPES.has(channel.type)) {
    return new ManualAdapter(creds || {});
  }

  // CUSTOM_WEBHOOK works without credentials (signature validation optional)
  const webhookTypes = ['CUSTOM_WEBHOOK', 'WEBSITE', 'B2B_PORTAL'];
  if (!creds && !webhookTypes.includes(channel.type)) {
    throw new Error('Channel has no credentials. Connect it first via POST /channels/:id/connect');
  }

  // Decrypt if stored encrypted
  if (creds && creds.iv && creds.data) creds = decryptCredentials(creds);

  switch (channel.type) {

    // ── ECOM ──────────────────────────────────────────────
    case 'AMAZON':    return new AmazonAdapter(creds);
    case 'FLIPKART':  return new FlipkartAdapter(creds);
    case 'MEESHO':    return new MeeshoAdapter(creds);
    case 'MYNTRA':    return new MyntraAdapter(creds);
    case 'NYKAA':     return new NykaaAdapter(creds);
    case 'AJIO':      return new AjioAdapter(creds);
    case 'TATA_CLIQ': return new TataCliqAdapter(creds);
    case 'SNAPDEAL':  return new SnapdealAdapter(creds);
    case 'GLOWROAD':  return new GlowRoadAdapter(creds);
    case 'JIOMART':   return new JioMartAdapter(creds);
    case 'PAYTM_MALL':return new PaytmMallAdapter(creds);
    case 'LIMEROAD':  return new LimeRoadAdapter(creds);
    case 'EBAY':      return new EbayAdapter(creds);
    case 'ETSY':      return new EtsyAdapter(creds);

    // ── QUICKCOM ──────────────────────────────────────────
    case 'BLINKIT':          return new BlinkitAdapter(creds);
    case 'ZEPTO':            return new ZeptoAdapter(creds);
    case 'SWIGGY_INSTAMART': return new SwiggyInstamartAdapter(creds);
    case 'BB_NOW':           return new BBNowAdapter(creds);

    // ── LOGISTICS ─────────────────────────────────────────
    case 'SHIPROCKET':  return new ShiprocketAdapter(creds);
    case 'DELHIVERY':   return new DelhiveryAdapter(creds);
    case 'FSHIP':       return new FshipAdapter(creds);
    case 'ECOMEXPRESS': return new EcomExpressAdapter(creds);
    case 'XPRESSBEES':  return new XpressbeesAdapter(creds);
    case 'SHADOWFAX':   return new ShadowfaxAdapter(creds);
    case 'BLUEDART':    return new BlueDartAdapter(creds);
    case 'DTDC':        return new DTDCAdapter(creds);
    case 'FEDEX':       return new FedExAdapter(creds);
    case 'DHL':         return new DHLAdapter(creds);
    case 'UPS':         return new UPSAdapter(creds);
    case 'ITHINK':      return new IThinkAdapter(creds);
    case 'PICKRR':      return new PickrrAdapter(creds);
    case 'SHIPWAY':     return new ShipwayAdapter(creds);
    case 'NIMBUSPOST':  return new NimbusPostAdapter(creds);
    case 'CLICKPOST':   return new ClickPostAdapter(creds);

    // ── OWNSTORE ──────────────────────────────────────────
    case 'AMAZON_SMARTBIZ': return new AmazonSmartBizAdapter(creds);
    case 'SHOPIFY':         return new ShopifyAdapter(creds);
    case 'WOOCOMMERCE':     return new WooCommerceAdapter(creds);
    case 'MAGENTO':         return new MagentoAdapter(creds);
    case 'BIGCOMMERCE':     return new BigCommerceAdapter(creds);
    case 'OPENCART':        return new OpenCartAdapter(creds);

    case 'WEBSITE':
      // Custom website uses the webhook adapter
      return new CustomWebhookAdapter(creds || {});

    // OFFLINE/POS handled above by MANUAL_TYPES early-return.

    // ── SOCIAL ────────────────────────────────────────────
    case 'INSTAGRAM':         return new InstagramAdapter(creds);
    case 'FACEBOOK':          return new FacebookAdapter(creds);
    case 'WHATSAPP_BUSINESS': return new WhatsAppBusinessAdapter(creds);

    // ── B2B ───────────────────────────────────────────────
    case 'B2B_PORTAL':
      return new CustomWebhookAdapter(creds || {});

    // WHOLESALE/DISTRIBUTOR handled above by MANUAL_TYPES early-return.

    // ── CUSTOM ────────────────────────────────────────────
    case 'CUSTOM_WEBHOOK':
      return new CustomWebhookAdapter(creds || {});

    case 'OTHER':
      throw new Error('OTHER: no adapter available. Use CUSTOM_WEBHOOK to receive orders via webhook.');

    default:
      throw new Error(`No adapter for channel type: ${channel.type}`);
  }
}

// ── Order import ─────────────────────────────────────────────────────────────

async function importOrders(channelId, rawOrders, { tenantId } = {}) {
  // Fall back to looking up tenantId from the channel if not supplied
  if (!tenantId) {
    const ch = await prisma.channel.findUnique({ where: { id: channelId }, select: { tenantId: true } });
    if (!ch) throw new Error('Channel not found');
    tenantId = ch.tenantId;
  }

  const results = { imported: 0, skipped: 0, failed: 0, errors: [] };

  for (const raw of rawOrders) {
    try {
      const existing = await prisma.order.findFirst({
        where: { tenantId, channelId, channelOrderId: raw.channelOrderId },
      });
      if (existing) { results.skipped++; continue; }

      let customer = raw.customer.email
        ? await prisma.customer.findFirst({ where: { tenantId, email: raw.customer.email } })
        : null;
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            tenantId,
            name: raw.customer.name || 'Unknown',
            email: raw.customer.email || null,
            phone: raw.customer.phone || null,
          },
        });
      }

      const resolvedItems = [];
      for (const item of raw.items) {
        if (!item.channelSku) continue;
        const listing = await prisma.channelListing.findFirst({
          where: { tenantId, channelId, channelSku: item.channelSku },
        });
        if (listing) resolvedItems.push({ ...item, variantId: listing.variantId });
      }

      if (!resolvedItems.length && raw.items.length > 0) {
        results.failed++;
        results.errors.push(`Order ${raw.channelOrderId}: no mapped SKUs — map them via POST /channels/:id/listings`);
        continue;
      }

      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Load the channel record once to know its type + default fulfillment
      const channelRecord = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { type: true, defaultFulfillmentType: true },
      });

      // 1. Resolve fulfillment model (SELF / CHANNEL / DROPSHIP)
      const fulfillmentType = resolveFulfillmentType(raw, channelRecord);
      const channelFulfillmentCenter =
        raw.fulfillmentCenter || raw.warehouseCode || raw.fcCode || null;

      // 2. Assess data completeness
      const completeness = assessCompleteness(raw, { fulfillmentType });

      // 3. Smart routing — ONLY for orders we ship ourselves (SELF)
      let routing = null;
      if (fulfillmentType === 'SELF' && resolvedItems.length > 0) {
        try {
          routing = await pickBestWarehouse({
            tenantId,
            items: resolvedItems,
            shippingAddress: raw.shippingAddress,
          });
        } catch (e) {
          console.warn(`[import] routing failed for order ${raw.channelOrderId}: ${e.message}`);
        }
      }

      // 4. RTO risk score — skip for CHANNEL-fulfilled (channel handles fraud/RTO)
      let rto = null;
      if (fulfillmentType === 'SELF') {
        try {
          rto = await scoreOrder({
            tenantId,
            paymentMethod: raw.paymentMethod,
            total: raw.total,
            customerId: customer.id,
            customer,
            shippingAddress: raw.shippingAddress,
            orderedAt: raw.orderedAt,
            channelType: channelRecord?.type,
          });
        } catch (e) {
          console.warn(`[import] RTO scoring failed for order ${raw.channelOrderId}: ${e.message}`);
        }
      }

      // 5. Initial status — CHANNEL-fulfilled orders start already confirmed
      const initialStatus =
        raw.status ||
        (fulfillmentType === 'CHANNEL' ? 'PROCESSING' : 'PENDING');

      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            tenantId,
            orderNumber,
            channelId,
            channelOrderId: raw.channelOrderId,
            customerId: customer.id,
            warehouseId: routing?.warehouseId || null,
            shippingAddress: raw.shippingAddress,
            subtotal: raw.subtotal,
            shippingCharge: raw.shippingCharge || 0,
            tax: raw.tax || 0,
            discount: raw.discount || 0,
            total: raw.total,
            paymentMethod: raw.paymentMethod,
            paymentStatus: raw.paymentStatus || 'PENDING',
            status: initialStatus,
            orderedAt: raw.orderedAt || new Date(),
            rtoScore: rto?.score ?? null,
            rtoRiskLevel: rto?.level ?? null,
            rtoFactors: rto?.factors ?? null,
            needsApproval: rto?.needsApproval ?? false,
            fulfillmentType,
            channelFulfillmentCenter,
            awb: raw.awb || null,
            courierTrackingUrl: raw.trackingUrl || raw.courierTrackingUrl || null,
            dataCompleteness: completeness.level,
            missingFields: completeness.missing,
            ...(resolvedItems.length > 0 && {
              items: {
                create: resolvedItems.map((i) => ({
                  tenantId,
                  variantId: i.variantId,
                  qty: i.qty,
                  unitPrice: i.unitPrice,
                  discount: i.discount || 0,
                  tax: i.tax || 0,
                  total: i.unitPrice * i.qty - (i.discount || 0) + (i.tax || 0),
                })),
              },
            }),
          },
        });

        // Bump PAYG usage meter for this tenant
        const period = new Date().toISOString().slice(0, 7);
        await tx.usageMeter.upsert({
          where: { tenantId_metric_period: { tenantId, metric: 'orders', period } },
          update: { count: { increment: 1 } },
          create: { tenantId, metric: 'orders', period, count: 1 },
        });
      });

      results.imported++;
    } catch (err) {
      results.failed++;
      results.errors.push(`Order ${raw.channelOrderId}: ${err.message}`);
    }
  }

  return results;
}

// ── Inventory push ───────────────────────────────────────────────────────────

async function pushInventoryToChannel(channel, { tenantId } = {}) {
  const adapter = getAdapter(channel);
  const scopedTenantId = tenantId || channel.tenantId;
  const listings = await prisma.channelListing.findMany({
    where: { tenantId: scopedTenantId, channelId: channel.id, isActive: true },
    include: { variant: { include: { inventoryItems: true } } },
  });

  const results = { updated: 0, failed: 0, errors: [] };
  for (const listing of listings) {
    try {
      const totalQty = listing.variant.inventoryItems.reduce((s, inv) => s + inv.quantityAvailable, 0);
      await adapter.updateInventoryLevel(listing.channelSku, totalQty);
      results.updated++;
    } catch (err) {
      results.failed++;
      results.errors.push(`SKU ${listing.channelSku}: ${err.message}`);
    }
  }
  return results;
}

// ── Product push ─────────────────────────────────────────────────────────────
// Push a single product (all variants) to every channel it's listed on.
// Each ChannelListing row says "this variant is listed on this channel as
// channelSku". We look up the listing, grab the variant's live fields from
// the local DB, and call adapter.updateListing(channelSku, fields).
async function pushProductToChannels(productId, { channelIds = null, tenantId = null } = {}) {
  const where = { id: productId };
  if (tenantId) where.tenantId = tenantId;
  const product = await prisma.product.findFirst({
    where,
    include: {
      variants: { include: { inventoryItems: true } },
      channelListings: { include: { channel: true, variant: true } },
    },
  });
  if (!product) throw new Error('Product not found');

  const results = { updated: 0, skipped: 0, failed: 0, perChannel: [] };
  const images = Array.isArray(product.images) ? product.images : [];

  for (const listing of product.channelListings) {
    // Allow caller to scope the push to specific channels
    if (channelIds && !channelIds.includes(listing.channelId)) continue;
    if (!listing.channel.isActive) { results.skipped++; continue; }
    if (!listing.variant) { results.skipped++; continue; }

    // Aggregate stock across all warehouses for this variant
    const variant = product.variants.find(v => v.id === listing.variantId);
    const totalQty = variant
      ? variant.inventoryItems.reduce((s, inv) => s + inv.quantityAvailable, 0)
      : 0;

    const fields = {
      title: product.name,
      description: product.description || undefined,
      images: images.length ? images : undefined,
      price: listing.channelPrice ? parseFloat(listing.channelPrice) : parseFloat(variant.sellingPrice),
      mrp: parseFloat(variant.mrp),
      qty: totalQty,
    };

    let adapter;
    try {
      adapter = getAdapter(listing.channel);
    } catch (err) {
      results.skipped++;
      results.perChannel.push({ channelId: listing.channelId, channelName: listing.channel.name, status: 'skipped', reason: err.message });
      continue;
    }

    if (typeof adapter.updateListing !== 'function') {
      results.skipped++;
      results.perChannel.push({ channelId: listing.channelId, channelName: listing.channel.name, status: 'skipped', reason: 'channel does not support product updates' });
      continue;
    }

    try {
      const result = await adapter.updateListing(listing.channelSku, fields);
      results.updated++;
      results.perChannel.push({ channelId: listing.channelId, channelName: listing.channel.name, status: 'updated', result });
    } catch (err) {
      results.failed++;
      results.perChannel.push({ channelId: listing.channelId, channelName: listing.channel.name, status: 'failed', error: err.message });
    }
  }

  return results;
}

module.exports = { getAdapter, getCategoryForType, importOrders, pushInventoryToChannel, pushProductToChannels };
