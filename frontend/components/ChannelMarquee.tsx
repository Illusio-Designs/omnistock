'use client';

// ── Every single channel supported by OmniStock ──────────────────────────
// Keep this in sync with backend/src/data/channel-catalog.js
export const ALL_CHANNELS = [
  // ECOM
  { name: 'Amazon',          category: 'ECOM',      color: 'from-orange-400 to-amber-500'    },
  { name: 'Flipkart',        category: 'ECOM',      color: 'from-blue-400 to-blue-600'       },
  { name: 'Myntra',          category: 'ECOM',      color: 'from-pink-500 to-rose-600'       },
  { name: 'Meesho',          category: 'ECOM',      color: 'from-fuchsia-500 to-pink-600'    },
  { name: 'Nykaa',           category: 'ECOM',      color: 'from-pink-400 to-fuchsia-500'    },
  { name: 'Ajio',            category: 'ECOM',      color: 'from-slate-700 to-slate-900'     },
  { name: 'Tata Cliq',       category: 'ECOM',      color: 'from-red-500 to-rose-600'        },
  { name: 'Snapdeal',        category: 'ECOM',      color: 'from-red-400 to-orange-500'      },
  { name: 'JioMart',         category: 'ECOM',      color: 'from-blue-500 to-indigo-600'     },
  { name: 'Paytm Mall',      category: 'ECOM',      color: 'from-sky-500 to-blue-600'        },
  { name: 'GlowRoad',        category: 'ECOM',      color: 'from-violet-400 to-purple-600'   },
  { name: 'LimeRoad',        category: 'ECOM',      color: 'from-lime-500 to-green-600'      },
  { name: 'eBay',            category: 'ECOM',      color: 'from-red-500 to-yellow-500'      },
  { name: 'Etsy',            category: 'ECOM',      color: 'from-orange-500 to-rose-500'     },
  // QUICKCOM
  { name: 'Blinkit',         category: 'QUICKCOM',  color: 'from-yellow-400 to-amber-500'    },
  { name: 'Zepto',           category: 'QUICKCOM',  color: 'from-violet-500 to-purple-600'   },
  { name: 'Swiggy Instamart',category: 'QUICKCOM',  color: 'from-orange-500 to-red-500'      },
  { name: 'BB Now',          category: 'QUICKCOM',  color: 'from-green-500 to-emerald-600'   },
  // LOGISTICS
  { name: 'Shiprocket',      category: 'LOGISTICS', color: 'from-violet-500 to-indigo-600'   },
  { name: 'Delhivery',       category: 'LOGISTICS', color: 'from-red-500 to-orange-600'      },
  { name: 'iThink',          category: 'LOGISTICS', color: 'from-sky-500 to-blue-600'        },
  { name: 'Pickrr',          category: 'LOGISTICS', color: 'from-blue-500 to-indigo-600'     },
  { name: 'NimbusPost',      category: 'LOGISTICS', color: 'from-cyan-500 to-blue-600'       },
  { name: 'ClickPost',       category: 'LOGISTICS', color: 'from-indigo-500 to-purple-600'   },
  { name: 'Shipway',         category: 'LOGISTICS', color: 'from-teal-500 to-cyan-600'       },
  { name: 'Fship',           category: 'LOGISTICS', color: 'from-emerald-500 to-teal-600'    },
  { name: 'Ecom Express',    category: 'LOGISTICS', color: 'from-red-500 to-pink-600'        },
  { name: 'Xpressbees',      category: 'LOGISTICS', color: 'from-indigo-500 to-blue-600'     },
  { name: 'Shadowfax',       category: 'LOGISTICS', color: 'from-slate-600 to-slate-900'     },
  { name: 'BlueDart',        category: 'LOGISTICS', color: 'from-blue-500 to-sky-600'        },
  { name: 'DTDC',            category: 'LOGISTICS', color: 'from-red-600 to-rose-700'        },
  { name: 'FedEx',           category: 'LOGISTICS', color: 'from-purple-500 to-orange-500'   },
  { name: 'DHL',             category: 'LOGISTICS', color: 'from-yellow-400 to-red-500'      },
  { name: 'UPS',             category: 'LOGISTICS', color: 'from-amber-700 to-yellow-600'    },
  // OWNSTORE
  { name: 'Shopify',         category: 'OWNSTORE',  color: 'from-green-500 to-emerald-600'   },
  { name: 'WooCommerce',     category: 'OWNSTORE',  color: 'from-purple-500 to-violet-600'   },
  { name: 'Magento',         category: 'OWNSTORE',  color: 'from-orange-500 to-red-600'      },
  { name: 'Amazon Smart Biz',category: 'OWNSTORE',  color: 'from-amber-500 to-orange-600'    },
  { name: 'BigCommerce',     category: 'OWNSTORE',  color: 'from-blue-500 to-indigo-600'     },
  { name: 'OpenCart',        category: 'OWNSTORE',  color: 'from-sky-500 to-cyan-600'        },
  // SOCIAL
  { name: 'Instagram',       category: 'SOCIAL',    color: 'from-pink-500 via-purple-500 to-orange-500' },
  { name: 'Facebook',        category: 'SOCIAL',    color: 'from-blue-500 to-indigo-600'     },
  { name: 'WhatsApp',        category: 'SOCIAL',    color: 'from-green-400 to-emerald-500'   },
];

function ChannelChip({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex-shrink-0">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
        {name.slice(0, 2).toUpperCase()}
      </div>
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
            <ChannelChip key={`r1-${i}`} name={c.name} color={c.color} />
          ))}
        </div>
      </div>

      {/* Row 2 — right */}
      <div className="flex overflow-hidden">
        <div className="flex gap-3 animate-marquee-reverse">
          {[...row2, ...row2].map((c, i) => (
            <ChannelChip key={`r2-${i}`} name={c.name} color={c.color} />
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
            <ChannelChip key={`c-${i}`} name={c.name} color={c.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
