'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Sparkles, Send, AlertCircle } from 'lucide-react';
import { leadsApi, type LeadSource } from '@/lib/api';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
  source?: LeadSource;
  // Pre-fill subject (used when opened from "Talk to Sales" on a specific plan)
  defaultSubject?: string;
  // Title override
  title?: string;
  description?: string;
}

interface DemoForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const EMPTY: DemoForm = { name: '', email: '', phone: '', company: '', message: '' };

export function DemoModal({
  open,
  onClose,
  source = 'demo',
  defaultSubject,
  title = 'Schedule a Demo',
  description = "Tell us a bit about yourself and we'll be in touch within 2 business hours.",
}: DemoModalProps) {
  const [form, setForm] = useState<DemoForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the modal re-opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setSubmitted(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await leadsApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        subject: defaultSubject || undefined,
        message: form.message.trim() || undefined,
        source,
        metadata: typeof window !== 'undefined' ? { path: window.location.pathname } : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      setError(
        Array.isArray(msg)
          ? msg.map((m: any) => m.message || m).join(', ')
          : (typeof msg === 'string' ? msg : 'Something went wrong. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="lg">
      {submitted ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Thanks — request received!</h3>
          <p className="text-slate-600 mt-2">
            Our team will reach out within 2 business hours to schedule your demo.
          </p>
          <Button onClick={onClose} className="mt-6">Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {defaultSubject && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <Sparkles size={12} /> {defaultSubject}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-premium"
                placeholder="Jane Doe"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Work email <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-premium"
                placeholder="jane@company.com"
                maxLength={190}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-premium"
                placeholder="+91 98765 43210"
                maxLength={40}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Company
              </label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="input-premium"
                placeholder="Acme Brands"
                maxLength={190}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              What would you like to see?
            </label>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input-premium"
              placeholder="Channels you sell on, monthly volume, key pain points…"
              maxLength={5000}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[160px] justify-center">
              {submitting ? 'Sending…' : (<>Request Demo <Send size={14} /></>)}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
