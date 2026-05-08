'use client';

import { useEffect, useMemo, useState } from 'react';
import { leadsApi, type LeadStatus, type LeadSource } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui';
import {
  Inbox, Search, Mail, Phone, Building2, Trash2, MessageSquare,
  ExternalLink, CheckCircle2, X,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message?: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes?: string | null;
  ip?: string | null;
  contactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

const STATUS_BADGE: Record<LeadStatus, string> = {
  NEW:       'bg-emerald-100 text-emerald-700',
  CONTACTED: 'bg-sky-100 text-sky-700',
  QUALIFIED: 'bg-indigo-100 text-indigo-700',
  WON:       'bg-amber-100 text-amber-800',
  LOST:      'bg-slate-200 text-slate-600',
};

const SOURCE_LABEL: Record<LeadSource, string> = {
  demo:    'Demo',
  contact: 'Contact form',
  pricing: 'Pricing CTA',
  footer:  'Footer',
  other:   'Other',
};

function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ ALL: 0 });
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Lead | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadStatus>('NEW');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await leadsApi.list({
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
        page,
        limit: 20,
      });
      setLeads(r.data.leads || []);
      setTotal(r.data.total || 0);
      setCounts(r.data.counts || { ALL: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, source, page]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search]);

  const openLead = (lead: Lead) => {
    setActive(lead);
    setDraftStatus(lead.status);
    setDraftNotes(lead.notes || '');
    setConfirmDelete(false);
  };
  const closeLead = () => setActive(null);

  const dirty = useMemo(() => {
    if (!active) return false;
    return draftStatus !== active.status || (draftNotes || '') !== (active.notes || '');
  }, [active, draftStatus, draftNotes]);

  const saveLead = async () => {
    if (!active || !dirty) return;
    setSaving(true);
    try {
      const r = await leadsApi.update(active.id, { status: draftStatus, notes: draftNotes });
      setActive(r.data);
      setLeads((ls) => ls.map((l) => (l.id === active.id ? r.data : l)));
      // refresh counts
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    if (!active) return;
    setDeleting(true);
    try {
      await leadsApi.delete(active.id);
      setLeads((ls) => ls.filter((l) => l.id !== active.id));
      setActive(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent flex items-center gap-2">
            <Inbox size={24} className="text-emerald-600" /> Leads
          </h1>
          <p className="text-slate-500 mt-1">
            Demo requests, contact-form messages, and pricing inquiries from the public site.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Total</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-900">{counts.ALL ?? 0}</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4">
        <Tabs
          size="sm"
          value={status}
          onChange={(k) => { setStatus(k); setPage(1); }}
          items={[
            { key: '',          label: 'All',       badge: counts.ALL || undefined },
            ...STATUSES.map((s) => ({ key: s, label: s, badge: counts[s] || undefined })),
          ]}
        />
      </div>

      {/* Search + source filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value as LeadSource | ''); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
        >
          <option value="">All sources</option>
          {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Company</th>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && leads.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No leads match your filters.</td></tr>
              )}
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{lead.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail size={11} /> {lead.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.company ? (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Building2 size={12} className="text-slate-400" /> {lead.company}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                    {lead.phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {lead.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                      {SOURCE_LABEL[lead.source] || lead.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${STATUS_BADGE[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ExternalLink size={14} className="text-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              Page {page} of {totalPages} — {total} total
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!active}
        onClose={closeLead}
        title={active?.name || 'Lead'}
        description={active ? `${SOURCE_LABEL[active.source] || active.source} • ${fmtDate(active.createdAt)}` : ''}
        size="xl"
      >
        {active && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow icon={<Mail size={14} />} label="Email">
                <a href={`mailto:${active.email}`} className="text-emerald-700 hover:underline">{active.email}</a>
              </FieldRow>
              <FieldRow icon={<Phone size={14} />} label="Phone">
                {active.phone ? <a href={`tel:${active.phone}`} className="text-emerald-700 hover:underline">{active.phone}</a> : <span className="text-slate-400">—</span>}
              </FieldRow>
              <FieldRow icon={<Building2 size={14} />} label="Company">
                {active.company || <span className="text-slate-400">—</span>}
              </FieldRow>
              <FieldRow icon={<MessageSquare size={14} />} label="Subject">
                {active.subject || <span className="text-slate-400">—</span>}
              </FieldRow>
            </div>

            {active.message && (
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Message</div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                  {active.message}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as LeadStatus)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">First contacted</label>
                <div className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                  {fmtDate(active.contactedAt)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Internal notes</label>
              <textarea
                rows={4}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                placeholder="Notes only visible to platform admins…"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rose-600 font-semibold">Delete this lead?</span>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    <X size={14} /> Cancel
                  </Button>
                  <Button size="sm" onClick={deleteLead} disabled={deleting} className="!bg-rose-600 hover:!bg-rose-700 !shadow-rose-500/25">
                    {deleting ? 'Deleting…' : <><Trash2 size={14} /> Confirm delete</>}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Delete
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={closeLead}>Close</Button>
                <Button onClick={saveLead} disabled={!dirty || saving} className="min-w-[120px] justify-center">
                  {saving ? 'Saving…' : (<><CheckCircle2 size={14} /> Save</>)}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="text-sm text-slate-900 font-semibold">{children}</div>
    </div>
  );
}
