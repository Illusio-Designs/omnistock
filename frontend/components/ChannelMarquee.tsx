'use client';

// ── Every single channel supported by Uniflo ──────────────────────────
// Keep this in sync with backend/src/data/channel-catalog.js
export const ALL_CHANNELS = [
  // ECOM
  { name: 'Amazon',          category: 'ECOM',      color: 'from-orange-400 to-amber-500',     logo: '/logos/amazon.png' },
  { name: 'Flipkart',        category: 'ECOM',      color: 'from-blue-400 to-blue-600',        logo: '/logos/flipkart.png' },
  { name: 'Myntra',          category: 'ECOM',      color: 'from-pink-500 to-rose-600',        logo: '/logos/myntra.png' },
  { name: 'Meesho',          category: 'ECOM',      color: 'from-fuchsia-500 to-pink-600',     logo: '/logos/meesho.png' },
  { name: 'Nykaa',           category: 'ECOM',      color: 'from-pink-400 to-fuchsia-500',     logo: '/logos/nykaa.png' },
  { name: 'Ajio',            category: 'ECOM',      color: 'from-slate-700 to-slate-900',      logo: '/logos/ajio.png' },
  { name: 'Tata Cliq',       category: 'ECOM',      color: 'from-red-500 to-rose-600',         logo: '/logos/tatacliq.png' },
  { name: 'Snapdeal',        category: 'ECOM',      color: 'from-red-400 to-orange-500',       logo: '/logos/snapdeal.png' },
  { name: 'JioMart',         category: 'ECOM',      color: 'from-blue-500 to-indigo-600',      logo: '/logos/jiomart.png' },
  { name: 'Paytm Mall',      category: 'ECOM',      color: 'from-sky-500 to-blue-600',         logo: '/logos/paytm.png' },
  { name: 'GlowRoad',        category: 'ECOM',      color: 'from-violet-400 to-purple-600',    logo: '/logos/glowroad.png' },
  { name: 'LimeRoad',        category: 'ECOM',      color: 'from-lime-500 to-green-600',       logo: '/logos/limeroad.png' },
  { name: 'eBay',            category: 'ECOM',      color: 'from-red-500 to-yellow-500',       logo: '/logos/ebay.png' },
  { name: 'Etsy',            category: 'ECOM',      color: 'from-orange-500 to-rose-500',      logo: '/logos/etsy.svg' },
  // QUICKCOM
  { name: 'Blinkit',         category: 'QUICKCOM',  color: 'from-yellow-400 to-amber-500',     logo: '/logos/blinkit.png' },
  { name: 'Zepto',           category: 'QUICKCOM',  color: 'from-violet-500 to-purple-600',    logo: '/logos/zepto.png' },
  { name: 'Swiggy Instamart',category: 'QUICKCOM',  color: 'from-orange-500 to-red-500',       logo: '/logos/swiggy.png' },
  { name: 'BB Now',          category: 'QUICKCOM',  color: 'from-green-500 to-emerald-600',    logo: '/logos/bigbasket.png' },
  // LOGISTICS
  { name: 'Shiprocket',      category: 'LOGISTICS', color: 'from-violet-500 to-indigo-600',    logo: '/logos/shiprocket.png' },
  { name: 'Delhivery',       category: 'LOGISTICS', color: 'from-red-500 to-orange-600',       logo: '/logos/delhivery.png' },
  { name: 'iThink',          category: 'LOGISTICS', color: 'from-sky-500 to-blue-600',         logo: '/logos/ithink.png' },
  { name: 'Pickrr',          category: 'LOGISTICS', color: 'from-blue-500 to-indigo-600',      logo: '/logos/pickrr.png' },
  { name: 'NimbusPost',      category: 'LOGISTICS', color: 'from-cyan-500 to-blue-600',        logo: '/logos/nimbuspost.png' },
  { name: 'ClickPost',       category: 'LOGISTICS', color: 'from-indigo-500 to-purple-600',    logo: '/logos/clickpost.png' },
  { name: 'Shipway',         category: 'LOGISTICS', color: 'from-teal-500 to-cyan-600',        logo: '/logos/shipway.png' },
  { name: 'Fship',           category: 'LOGISTICS', color: 'from-emerald-500 to-teal-600',     logo: '/logos/fship.png' },
  { name: 'Ecom Express',    category: 'LOGISTICS', color: 'from-red-500 to-pink-600',         logo: '/logos/ecomexpress.png' },
  { name: 'Xpressbees',      category: 'LOGISTICS', color: 'from-indigo-500 to-blue-600',      logo: '/logos/xpressbees.png' },
  { name: 'Shadowfax',       category: 'LOGISTICS', color: 'from-slate-600 to-slate-900',      logo: '/logos/shadowfax.png' },
  { name: 'BlueDart',        category: 'LOGISTICS', color: 'from-blue-500 to-sky-600',         logo: '/logos/bluedart.png' },
  { name: 'DTDC',            category: 'LOGISTICS', color: 'from-red-600 to-rose-700',         logo: '/logos/dtdc.png' },
  { name: 'FedEx',           category: 'LOGISTICS', color: 'from-purple-500 to-orange-500',    logo: '/logos/fedex.png' },
  { name: 'DHL',             category: 'LOGISTICS', color: 'from-yellow-400 to-red-500',       logo: '/logos/dhl.png' },
  { name: 'UPS',             category: 'LOGISTICS', color: 'from-amber-700 to-yellow-600',     logo: '/logos/ups.png' },
  // OWNSTORE
  { name: 'Shopify',         category: 'OWNSTORE',  color: 'from-green-500 to-emerald-600',    logo: '/logos/shopify.png' },
  { name: 'WooCommerce',     category: 'OWNSTORE',  color: 'from-purple-500 to-violet-600',    logo: '/logos/woocommerce.png' },
  { name: 'Magento',         category: 'OWNSTORE',  color: 'from-orange-500 to-red-600',       logo: '/logos/magento.png' },
  { name: 'Amazon Smart Biz',category: 'OWNSTORE',  color: 'from-amber-500 to-orange-600',     logo: '/logos/amazon.png' },
  { name: 'BigCommerce',     category: 'OWNSTORE',  color: 'from-blue-500 to-indigo-600',      logo: '/logos/bigcommerce.png' },
  { name: 'OpenCart',        category: 'OWNSTORE',  color: 'from-sky-500 to-cyan-600',         logo: '/logos/opencart.png' },
  // SOCIAL
  { name: 'Instagram',       category: 'SOCIAL',    color: 'from-pink-500 via-purple-500 to-orange-500', logo: '/logos/instagram.png' },
  { name: 'Facebook',        category: 'SOCIAL',    color: 'from-blue-500 to-indigo-600',      logo: '/logos/facebook.png' },
  { name: 'WhatsApp',        category: 'SOCIAL',    color: 'from-green-400 to-emerald-500',    logo: '/logos/whatsapp.png' },
];

function ChannelChip({ name, color, logo }: { name: string; color: string; logo: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={name}
        width={36}
        height={36}
        loading="lazy"
        className="w-9 h-9 rounded-xl object-contain bg-white p-0.5"
        style={{ imageRendering: 'auto' }}
        onError={(e) => {
          // Fallback to gradient letter if logo missing
          const el = e.currentTarget as HTMLImageElement;
          const div = document.createElement('div');
          div.className = `w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shadow-md`;
          div.textContent = name.slice(0, 2).toUpperCase();
          el.replaceWith(div);
        }}
      />
      <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{name}</span>
    </div>
  );
}

export function ChannelMarquee() {
  // Split into 2 rows that scroll in opposite directions
  const half = Math.ceil(ALL_CHANNELS.length / 2);
  const row1 = ALL_CHANNELS.slice(0, half);
  const row2 = ALL_CHANNELS.slice(half);

  return (
    <div className="relative space-y-4 marquee-mask group">
      {/* Row 1 — left */}
      <div className="flex overflow-hidden">
        <div className="flex gap-3 animate-marquee">
          {[...row1, ...row1].map((c, i) => (
            <ChannelChip key={`r1-${i}`} name={c.name} color={c.color} logo={c.logo} />
          ))}
        </div>
      </div>

      {/* Row 2 — right */}
      <div className="flex overflow-hidden">
        <div className="flex gap-3 animate-marquee-reverse">
          {[...row2, ...row2].map((c, i) => (
            <ChannelChip key={`r2-${i}`} name={c.name} color={c.color} logo={c.logo} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact single-row marquee — for smaller spaces */
export function ChannelMarqueeCompact() {
  return (
    <div className="relative marquee-mask group">
      <div className="flex overflow-hidden">
        <div className="flex gap-3 animate-marquee">
          {[...ALL_CHANNELS, ...ALL_CHANNELS].map((c, i) => (
            <ChannelChip key={`c-${i}`} name={c.name} color={c.color} logo={c.logo} />
          ))}
        </div>
      </div>
    </div>
  );
}
