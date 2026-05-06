'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  BarChart3, Eye, Facebook, ExternalLink, CheckCircle2, AlertCircle, Settings, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type SettingItem = {
  key: string;
  label: string;
  description?: string;
  value: string | null;
  isSet: boolean;
  updatedAt: string | null;
};

type Provider = {
  key: string;
  name: string;
  tagline: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  dashboardUrl: string;
  dashboardLabel: string;
  helpText: string;
  validate: (id: string) => boolean;
  format: string;
};

const PROVIDERS: Provider[] = [
  {
    key: 'tracking.gaId',
    name: 'Google Analytics 4',
    tagline: 'Pageviews, sessions, conversions',
    icon: BarChart3,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    dashboardUrl: 'https://analytics.google.com/',
    dashboardLabel: 'Open GA4 dashboard',
    helpText: 'Find your Measurement ID in GA4 → Admin → Data Streams → your stream.',
    validate: (id) => /^G-[A-Z0-9]{6,}$/.test(id),
    format: 'G-XXXXXXXXXX',
  },
  {
    key: 'tracking.fbPixelId',
    name: 'Facebook Pixel',
    tagline: 'Ad attribution, conversion API',
    icon: Facebook,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    dashboardUrl: 'https://business.facebook.com/events_manager/',
    dashboardLabel: 'Open Events Manager',
    helpText: 'Get your Pixel ID from Meta Business → Events Manager → your dataset.',
    validate: (id) => /^\d{8,20}$/.test(id),
    format: '15-digit number',
  },
  {
    key: 'tracking.clarityId',
    name: 'Microsoft Clarity',
    tagline: 'Heatmaps, session recordings',
    icon: Eye,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    dashboardUrl: 'https://clarity.microsoft.com/',
    dashboardLabel: 'Open Clarity dashboard',
    helpText: 'From clarity.microsoft.com → your project → Settings → Setup.',
    validate: (id) => /^[a-z0-9]{8,}$/i.test(id),
    format: 'Project ID',
  },
];

export default function AdminAnalyticsPage() {
  const [items, setItems] = useState<Record<string, SettingItem>>({});
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .settings()
      .then((r) => {
        const tracking: SettingItem[] = r.data?.tracking || [];
        const map: Record<string, SettingItem> = {};
        for (const it of tracking) map[it.key] = it;
        setItems(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const copy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const configuredCount = PROVIDERS.filter((p) => items[p.key]?.isSet).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">
            Analytics &amp; Tracking
          </h1>
          <p className="text-slate-500 mt-1">
            All third-party tracking integrations injected into the public site. Configure IDs once
            here — Kartriq handles the script tags, CSP allowlists, and PageView events on every
            route change.
          </p>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline" leftIcon={<Settings size={14} />}>
            Edit in settings
          </Button>
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-8">
        <SummaryStat
          label="Active integrations"
          value={`${configuredCount} / ${PROVIDERS.length}`}
          accent={configuredCount === PROVIDERS.length ? 'emerald' : configuredCount > 0 ? 'amber' : 'slate'}
        />
        <SummaryStat
          label="Page-load impact"
          value={configuredCount === 0 ? '0 KB' : `~${configuredCount * 35} KB`}
          accent="slate"
          hint="Estimated combined script weight (gzipped)."
        />
        <SummaryStat
          label="Loaded on"
          value="Public site"
          accent="slate"
          hint="Trackers do NOT run on /dashboard, /admin, or any authenticated route."
        />
      </div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const item = items[p.key];
          const id = item?.value || '';
          const isSet = !!item?.isSet;
          const valid = isSet && p.validate(id);
          const masked = id.length > 6 ? `${id.slice(0, 4)}…${id.slice(-3)}` : id;

          return (
            <div
              key={p.key}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col"
            >
              {/* Heading */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl ${p.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={p.iconColor} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{p.tagline}</p>
                  </div>
                </div>
                <StatusPill state={loading ? 'loading' : isSet ? (valid ? 'active' : 'invalid') : 'missing'} />
              </div>

              {/* ID block */}
              {loading ? (
                <div className="h-16 bg-slate-50 rounded-lg" />
              ) : isSet ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Configured ID
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-slate-900 truncate">{masked}</code>
                    <button
                      onClick={() => copy(p.key, id)}
                      className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 inline-flex items-center gap-1 flex-shrink-0"
                    >
                      <Copy size={11} />
                      {copiedKey === p.key ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {!valid && (
                    <div className="mt-2 text-[11px] text-amber-700 flex items-start gap-1">
                      <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
                      <span>Stored value doesn&apos;t look like a valid {p.format}.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-800">
                  Not configured. The provider script is not injected.
                </div>
              )}

              {/* Help text */}
              <p className="text-[12px] text-slate-500 mt-3 leading-relaxed flex-1">{p.helpText}</p>

              {/* Footer actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <Link href="/admin/settings" className="flex-1">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<Settings size={12} />}>
                    {isSet ? 'Edit ID' : 'Add ID'}
                  </Button>
                </Link>
                <a
                  href={p.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="primary" size="sm" fullWidth rightIcon={<ExternalLink size={12} />}>
                    Open
                  </Button>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Implementation notes */}
      <div className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-slate-900 mb-2">How tracking works</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>IDs are stored in <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">platformSettings</code> (category <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">tracking</code>).</li>
          <li>The public route <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">GET /api/v1/tracking</code> exposes them un-authenticated so the marketing site can render them.</li>
          <li><code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">components/Analytics.tsx</code> injects the GA, FB Pixel, and Clarity script tags using Next.js <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">&lt;Script strategy=&quot;afterInteractive&quot; /&gt;</code>.</li>
          <li>CSP allowlist for the third-party domains lives in <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">frontend/next.config.js</code>.</li>
          <li>Authenticated routes (<code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">/dashboard</code>, <code className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded">/admin</code>) deliberately exclude these scripts to keep operator activity out of the public funnel.</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SummaryStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: 'emerald' | 'amber' | 'slate';
}) {
  const accentClass =
    accent === 'emerald' ? 'text-emerald-600' :
    accent === 'amber' ? 'text-amber-600' :
    'text-slate-900';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">{hint}</div>}
    </div>
  );
}

function StatusPill({ state }: { state: 'active' | 'invalid' | 'missing' | 'loading' }) {
  if (state === 'loading') {
    return <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />;
  }
  if (state === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1 uppercase tracking-wider">
        <CheckCircle2 size={10} /> Active
      </span>
    );
  }
  if (state === 'invalid') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 uppercase tracking-wider">
        <AlertCircle size={10} /> Check ID
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 uppercase tracking-wider">
      Not set
    </span>
  );
}
