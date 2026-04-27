'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { channelApi } from '@/lib/api';
import {
  Plug, CheckCircle2, Circle, Clock, ExternalLink, Inbox, Sparkles, Lock,
  ShoppingBag, Zap, Truck, Globe, MessageCircle, Building2, Boxes, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const CATEGORY_ORDER = ['ECOM', 'QUICKCOM', 'LOGISTICS', 'OWNSTORE', 'SOCIAL', 'B2B', 'CUSTOM'];

const CATEGORY_META: Record<string, {
  label: string;
  tagline: string;
  icon: any;
  gradient: string;
  bgGradient: string;
  ringColor: string;
}> = {
  ECOM: {
    label: 'E-commerce Marketplaces',
    tagline: 'Biggest players — Amazon, Flipkart, Myntra & more',
    icon: ShoppingBag,
    gradient: 'from-violet-500 to-indigo-600',
    bgGradient: 'from-violet-50 via-white to-indigo-50',
    ringColor: 'ring-violet-200/60',
  },
  QUICKCOM: {
    label: 'Quick Commerce',
    tagline: '10-minute delivery — Blinkit, Zepto, Swiggy Instamart',
    icon: Zap,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50 via-white to-orange-50',
    ringColor: 'ring-amber-200/60',
  },
  LOGISTICS: {
    label: 'Logistics & Shipping',
    tagline: 'Couriers & aggregators — ship with one click',
    icon: Truck,
    gradient: 'from-sky-500 to-blue-600',
    bgGradient: 'from-sky-50 via-white to-blue-50',
    ringColor: 'ring-sky-200/60',
  },
  OWNSTORE: {
    label: 'Own Store Platforms',
    tagline: 'Your D2C website — Shopify, WooCommerce, Magento',
    icon: Globe,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 via-white to-teal-50',
    ringColor: 'ring-emerald-200/60',
  },
  SOCIAL: {
    label: 'Social Commerce',
    tagline: 'Sell where your customers hang out',
    icon: MessageCircle,
    gradient: 'from-pink-500 to-fuchsia-600',
    bgGradient: 'from-pink-50 via-white to-fuchsia-50',
    ringColor: 'ring-pink-200/60',
  },
  B2B: {
    label: 'B2B Channels',
    tagline: 'Wholesale, distributors, bulk orders',
    icon: Building2,
    gradient: 'from-indigo-500 to-purple-600',
    bgGradient: 'from-indigo-50 via-white to-purple-50',
    ringColor: 'ring-indigo-200/60',
  },
  CUSTOM: {
    label: 'Custom & Webhooks',
    tagline: 'Universal receivers for any system',
    icon: Sparkles,
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50 via-white to-pink-50',
    ringColor: 'ring-rose-200/60',
  },
};

type CatalogEntry = {
  type: string;
  category: string;
  name: string;
  tagline?: string;
  status: 'connected' | 'available' | 'not_available';
  integrated: boolean;
  requiresApproval?: boolean;
  features?: string[];
  applyUrl?: string;
  docsUrl?: string;
  connectedChannels?: Array<{ id: string; name: string }>;
  pendingRequest?: { id: string; status: string } | null;
};

export default function ChannelsPage() {
  const [statusFilter, setStatusFilter] = useState<'' | 'connected' | 'available' | 'not_available'>('');
  const [connectModal, setConnectModal] = useState<CatalogEntry | null>(null);
  const [requestModal, setRequestModal] = useState<CatalogEntry | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['channels-catalog'],
    queryFn: () => channelApi.catalog().then(r => r.data),
  });

  // Group catalog by category after filtering
  const grouped = useMemo(() => {
    const all: CatalogEntry[] = (data?.catalog || []).filter((e: CatalogEntry) => {
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
    const map: Record<string, CatalogEntry[]> = {};
    for (const entry of all) {
      if (!map[entry.category]) map[entry.category] = [];
      map[entry.category].push(entry);
    }
    return map;
  }, [data, statusFilter]);

  const summary = data?.summary || { total: 0, connected: 0, available: 0, not_available: 0 };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-8 md:p-10 text-white shadow-2xl shadow-emerald-500/25">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl translate-y-1/2" />

          <div className="relative flex items-end justify-between flex-wrap gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold tracking-wide mb-4">
                <Sparkles size={12} /> {summary.total} CHANNELS IN MARKET
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Sell everywhere.<br />
                <span className="bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">Ship anything.</span>
              </h1>
              <p className="text-white/80 text-sm md:text-base mt-3 leading-relaxed">
                Connect to {summary.total}+ marketplaces, quick-commerce, logistics, social shops and D2C platforms — all from one dashboard.
              </p>
            </div>

            <Link
              href="/channels/requests"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-sm font-semibold rounded-xl transition-all"
            >
              <Inbox size={15} /> My Requests
            </Link>
          </div>

          <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            <StatPill label="Connected"     value={summary.connected}     dot="bg-emerald-400" />
            <StatPill label="Available"     value={summary.available}     dot="bg-sky-400" />
            <StatPill label="Not Available" value={summary.not_available} dot="bg-amber-400" />
            <StatPill label="Total"         value={summary.total}         dot="bg-white" />
          </div>
        </div>

        {/* Quick-jump category nav */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORY_ORDER.map(key => {
            const meta = CATEGORY_META[key];
            const count = grouped[key]?.length || 0;
            if (count === 0) return null;
            const Icon = meta.icon;
            return (
              <a
                key={key}
                href={`#category-${key}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
              >
                <Icon size={14} />
                {meta.label}
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                  {count}
                </span>
              </a>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-3 items-center sticky top-16 z-20 py-3 -my-3 bg-gradient-to-b from-slate-50/95 via-slate-50/95 to-transparent backdrop-blur-md">
          <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
            {[
              { key: '',              label: 'All' },
              { key: 'connected',     label: 'Connected' },
              { key: 'available',     label: 'Available' },
              { key: 'not_available', label: 'Soon' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === f.key
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category sections */}
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-premium p-8 animate-shimmer h-56" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card-premium p-16 text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 items-center justify-center mb-4">
              <Plug size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">No channels match your filters</h3>
            <p className="text-slate-500 text-sm mt-1">Try different filters or search terms.</p>
          </div>
        ) : (
          CATEGORY_ORDER.filter(cat => grouped[cat]).map(category => (
            <CategorySection
              key={category}
              id={`category-${category}`}
              category={category}
              entries={grouped[category]}
              onConnect={setConnectModal}
              onRequest={setRequestModal}
            />
          ))
        )}
      </div>

      {connectModal && (
        <ConnectModal
          entry={connectModal}
          onClose={() => setConnectModal(null)}
          onSuccess={() => { setConnectModal(null); qc.invalidateQueries({ queryKey: ['channels-catalog'] }); }}
        />
      )}
      {requestModal && (
        <RequestModal
          entry={requestModal}
          onClose={() => setRequestModal(null)}
          onSuccess={() => { setRequestModal(null); qc.invalidateQueries({ queryKey: ['channels-catalog'] }); }}
        />
      )}
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function StatPill({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
      <div className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-[10px] font-semibold text-white/70 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function CategorySection({
  id, category, entries, onConnect, onRequest,
}: {
  id: string;
  category: string;
  entries: CatalogEntry[];
  onConnect: (e: CatalogEntry) => void;
  onRequest: (e: CatalogEntry) => void;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const connectedCount = entries.filter(e => e.status === 'connected').length;

  return (
    <section
      id={id}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.bgGradient} border border-slate-200/70 shadow-[0_4px_24px_rgba(15,15,30,0.04)] p-6 md:p-7 ring-1 ${meta.ringColor} scroll-mt-24`}
    >
      {/* Decorative gradient blob */}
      <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-3xl pointer-events-none`} />

      {/* Section header */}
      <div className="relative flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-xl`}>
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{meta.label}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{meta.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-white border border-slate-200 text-slate-700">
            {entries.length} channels
          </span>
          {connectedCount > 0 && (
            <span className="badge bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 size={11} /> {connectedCount} connected
            </span>
          )}
        </div>
      </div>

      {/* Channel grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(entry => (
          <ChannelCard
            key={entry.type}
            entry={entry}
            categoryGradient={meta.gradient}
            onConnect={() => onConnect(entry)}
            onRequest={() => onRequest(entry)}
          />
        ))}
      </div>
    </section>
  );
}

function ChannelCard({
  entry, categoryGradient, onConnect, onRequest,
}: {
  entry: CatalogEntry;
  categoryGradient: string;
  onConnect: () => void;
  onRequest: () => void;
}) {
  const STATUS_BADGES: Record<string, { icon: any; text: string; bg: string }> = {
    connected:     { icon: CheckCircle2, text: 'Connected',   bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    available:     { icon: Circle,       text: 'Available',   bg: 'bg-sky-50 text-sky-700 border-sky-200' },
    plan_locked:   { icon: Lock,         text: 'Upgrade plan',bg: 'bg-slate-100 text-slate-600 border-slate-200' },
    not_available: { icon: Clock,        text: 'Coming Soon', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const statusBadge = STATUS_BADGES[entry.status] || STATUS_BADGES.not_available;
  const StatusIcon = statusBadge.icon;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {entry.status === 'connected' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryGradient} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
            {entry.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{entry.name}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider truncate">{entry.type}</p>
          </div>
        </div>
      </div>

      {/* Status & tagline */}
      <div className="relative mb-3">
        <span className={`badge border ${statusBadge.bg} mb-2`}>
          <StatusIcon size={10} /> {statusBadge.text}
        </span>
        {entry.tagline && (
          <p className="text-xs text-slate-600 leading-relaxed mt-2 line-clamp-2">{entry.tagline}</p>
        )}
      </div>

      {entry.features && entry.features.length > 0 && (
        <div className="relative flex flex-wrap gap-1 mb-3">
          {entry.features.slice(0, 3).map(f => (
            <span key={f} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase tracking-wide">
              {f}
            </span>
          ))}
        </div>
      )}

      {entry.pendingRequest && (
        <div className="relative text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-1 mb-2 font-semibold">
          ⏳ Request {entry.pendingRequest.status.toLowerCase()}
        </div>
      )}

      {/* Action buttons */}
      <div className="relative mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5">
        {entry.status === 'connected' && entry.connectedChannels?.[0] ? (
          <Link
            href={`/channels/${entry.connectedChannels[0].id}`}
            className="flex-1 text-center px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors"
          >
            Manage <ChevronRight size={12} />
          </Link>
        ) : entry.status === 'available' ? (
          <button
            onClick={onConnect}
            className={`flex-1 px-3 py-2 bg-gradient-to-r ${categoryGradient} text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1`}
          >
            <Plug size={12} /> Connect
          </button>
        ) : (
          !entry.pendingRequest && (
            <button
              onClick={onRequest}
              className="flex-1 px-3 py-2 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50 transition-all flex items-center justify-center gap-1"
            >
              Request
            </button>
          )
        )}
        {entry.applyUrl && (
          <a
            href={entry.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            title="Apply for seller access"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function ConnectModal({
  entry, onClose, onSuccess,
}: { entry: CatalogEntry; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(`My ${entry.name}`);
  const [credentials, setCredentials] = useState<Record<string, any>>({});
  const [error, setError] = useState('');

  const { data: detail } = useQuery({
    queryKey: ['channel-catalog-entry', entry.type],
    queryFn: () => channelApi.catalogEntry(entry.type).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: created } = await channelApi.create({ name, type: entry.type, category: entry.category });
      await channelApi.connect(created.id, credentials);
      return created;
    },
    onSuccess,
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  const schema = detail?.credentialsSchema || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-3xl max-w-md w-full p-7 max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Connect {entry.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{entry.tagline}</p>
          </div>
        </div>

        {entry.requiresApproval && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 mb-4">
            ⚠️ This channel requires seller approval.{' '}
            {entry.applyUrl && (
              <a href={entry.applyUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                Apply here
              </a>
            )}{' '}
            before connecting.
          </div>
        )}

        <div className="space-y-3">
          <Field label="Channel Name" value={name} onChange={setName} required />
          {schema.map((field: any) => (
            <Field
              key={field.key}
              label={field.label}
              type={field.type}
              options={field.options}
              value={credentials[field.key] || ''}
              onChange={v => setCredentials(c => ({ ...c, [field.key]: v }))}
              required={field.required}
            />
          ))}
        </div>

        {error && <p className="text-xs text-rose-600 mt-3 font-medium">{error}</p>}

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            fullWidth
            loading={createMutation.isPending}
            onClick={() => { setError(''); createMutation.mutate(); }}
          >
            {createMutation.isPending ? 'Connecting…' : 'Connect Channel'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequestModal({
  entry, onClose, onSuccess,
}: { entry: CatalogEntry; onClose: () => void; onSuccess: () => void }) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const m = useMutation({
    mutationFn: () => channelApi.requestIntegration(entry.type, { notes }),
    onSuccess,
    onError: (err: any) => setError(err.response?.data?.error || err.message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-3xl max-w-md w-full p-7 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg text-white">
            <Inbox size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request {entry.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tell us why you need it — our team reviews each request.</p>
          </div>
        </div>

        <textarea
          placeholder="Use case, monthly volume, timeline, etc."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          className="input-premium"
        />
        {error && <p className="text-xs text-rose-600 mt-3 font-medium">{error}</p>}

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <button
            onClick={() => { setError(''); m.mutate(); }}
            disabled={m.isPending}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {m.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', options, required,
}: { label: string; value: any; onChange: (v: any) => void; type?: string; options?: string[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="input-premium">
          <option value="">Select…</option>
          {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="input-premium" />
      ) : (
        <input
          type={type === 'password' ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-premium"
        />
      )}
    </div>
  );
}
