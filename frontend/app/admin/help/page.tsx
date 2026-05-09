'use client';

import { useEffect, useMemo, useState } from 'react';
import { helpApi, type HelpFaq } from '@/lib/api';
import { Button, Modal, Input, Textarea, Tabs, EmptyState } from '@/components/ui';
import {
  LifeBuoy, Plus, Pencil, Trash2, CheckCircle2, EyeOff, ChevronUp, ChevronDown,
  ChevronRight, X,
} from 'lucide-react';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminHelpPage() {
  const [items, setItems] = useState<HelpFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editing, setEditing] = useState<HelpFaq | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HelpFaq | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await helpApi.adminFaqs();
      setItems(r.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'published') return items.filter((e) => e.isPublished);
    return items.filter((e) => !e.isPublished);
  }, [items, filter]);

  const onSave = async (
    data: { question: string; answer: string; category: string | null; isPublished: boolean },
    id?: string
  ) => {
    setBusy(true);
    try {
      if (id) await helpApi.adminUpdateFaq(id, data);
      else await helpApi.adminCreateFaq(data);
      await load();
      setEditing(null);
      setCreating(false);
    } finally { setBusy(false); }
  };

  const onDelete = async (faq: HelpFaq) => {
    setBusy(true);
    try {
      await helpApi.adminDeleteFaq(faq.id);
      await load();
      setConfirmDelete(null);
    } finally { setBusy(false); }
  };

  const togglePublish = async (faq: HelpFaq) => {
    setBusy(true);
    try {
      await helpApi.adminUpdateFaq(faq.id, { isPublished: !faq.isPublished });
      await load();
    } finally { setBusy(false); }
  };

  // Move a row up or down by swapping sortOrder with its neighbour, then
  // batch-save via the reorder endpoint.
  const move = async (faq: HelpFaq, direction: 'up' | 'down') => {
    // Reorder against the FULL list (not the filtered view) so positions
    // stay consistent regardless of the current filter.
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = ordered.findIndex((x) => x.id === faq.id);
    if (idx === -1) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[swapWith];
    setBusy(true);
    try {
      await helpApi.adminReorderFaqs([
        { id: a.id, sortOrder: b.sortOrder },
        { id: b.id, sortOrder: a.sortOrder },
      ]);
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent flex items-center gap-2">
            <LifeBuoy size={24} className="text-emerald-600" /> Help &amp; Support
          </h1>
          <p className="text-slate-500 mt-1">
            FAQs shown to logged-in users via the topbar help drawer. Drag-free reorder via the up/down arrows.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} leftIcon={<Plus size={14} />}>New FAQ</Button>
      </div>

      <div className="mb-4">
        <Tabs
          size="sm"
          value={filter}
          onChange={(k) => setFilter(k as any)}
          items={[
            { key: 'all',       label: 'All',       badge: items.length || undefined },
            { key: 'published', label: 'Published', badge: items.filter((e) => e.isPublished).length || undefined },
            { key: 'draft',     label: 'Drafts',    badge: items.filter((e) => !e.isPublished).length || undefined },
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy size={28} />}
            title="No FAQs yet"
            description="Add your first question. Keep it short — long answers can wrap as much as needed."
            action={<Button onClick={() => setCreating(true)} leftIcon={<Plus size={14} />}>New FAQ</Button>}
          />
        ) : (
          filtered.map((faq, i) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div key={faq.id} className="hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3 px-5 py-3">
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => move(faq, 'up')}
                      disabled={busy || i === 0 || filter !== 'all'}
                      title={filter !== 'all' ? 'Switch to All to reorder' : 'Move up'}
                      className="w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(faq, 'down')}
                      disabled={busy || i === filtered.length - 1 || filter !== 'all'}
                      title={filter !== 'all' ? 'Switch to All to reorder' : 'Move down'}
                      className="w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="flex-1 min-w-0 text-left flex items-start gap-2 py-1"
                  >
                    <ChevronRight
                      size={14}
                      className={`text-slate-400 mt-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{faq.question}</span>
                        {faq.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={10} /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                            <EyeOff size={10} /> Draft
                          </span>
                        )}
                        {faq.category && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                            {faq.category}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{faq.answer}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(faq)} disabled={busy}>
                      {faq.isPublished ? <><EyeOff size={13} /> Unpublish</> : <><CheckCircle2 size={13} /> Publish</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(faq)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(faq)} className="!text-rose-600 hover:!bg-rose-50">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-12 pb-4 -mt-1">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{faq.answer}</div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      Updated {fmtDate(faq.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {(creating || editing) && (
        <FaqFormModal
          faq={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={onSave}
          busy={busy}
        />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete FAQ?"
        description={confirmDelete?.question}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => confirmDelete && onDelete(confirmDelete)} disabled={busy} className="!bg-rose-600 hover:!bg-rose-700 !shadow-rose-500/25">
              {busy ? 'Deleting…' : <><Trash2 size={14} /> Delete</>}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">This FAQ will disappear from the help drawer immediately. This action can&apos;t be undone.</p>
      </Modal>
    </div>
  );
}

function FaqFormModal({
  faq, onClose, onSave, busy,
}: {
  faq: HelpFaq | null;
  onClose: () => void;
  onSave: (data: { question: string; answer: string; category: string | null; isPublished: boolean }, id?: string) => Promise<void>;
  busy: boolean;
}) {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [category, setCategory] = useState(faq?.category || '');
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const q = question.trim();
    const a = answer.trim();
    if (q.length < 3) return setError('Question is too short');
    if (a.length < 3) return setError('Answer is too short');
    await onSave(
      { question: q, answer: a, category: category.trim() || null, isPublished },
      faq?.id
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={faq ? 'Edit FAQ' : 'New FAQ'}
      description="The question and answer are shown to all logged-in users in the help drawer."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="min-w-[120px] justify-center">
            {busy ? 'Saving…' : (faq ? 'Save changes' : 'Create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How do I add a new product?"
          maxLength={255}
        />
        <Textarea
          label="Answer"
          rows={6}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Walk through the answer in plain language. Markdown is not parsed — keep it simple."
        />
        <Input
          label="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Billing, Channels, Inventory…"
          maxLength={64}
          hint="Used as a tag pill on the row in /admin/help."
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-slate-700">Published (visible in the topbar help drawer)</span>
        </label>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <X size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
