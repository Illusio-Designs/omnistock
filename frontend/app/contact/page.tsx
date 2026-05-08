'use client';

import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import {
  Sparkles, Mail, MessageCircle, Phone, MapPin, Send, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { leadsApi } from '@/lib/api';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await leadsApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject || undefined,
        message: form.message.trim() || undefined,
        source: 'contact',
        metadata: typeof window !== 'undefined' ? { path: window.location.pathname } : undefined,
      });
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      setError(
        Array.isArray(msg)
          ? msg.map((m: any) => m.message || m).join(', ')
          : (typeof msg === 'string' ? msg : 'Could not send your message. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-20 right-1/3 w-96 h-96 rounded-full bg-emerald-200/40 blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Contact
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
            Let's <span className="gradient-text">talk commerce.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto">
            Questions? Feedback? Want a demo? Our team usually replies within 2 hours.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact info cards */}
          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: Mail, title: 'Email', value: 'hello@kartriq.in', link: 'mailto:hello@kartriq.in' },
              { icon: MessageCircle, title: 'Chat', value: 'Live chat 9am – 9pm IST', link: '#' },
              { icon: Phone, title: 'Call', value: '+91 80 4123 4567', link: 'tel:+918041234567' },
              { icon: MapPin, title: 'Office', value: 'Koramangala, Bangalore, India', link: '#' },
            ].map(c => {
              const Icon = c.icon;
              return (
                <a
                  key={c.title}
                  href={c.link}
                  className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <Icon size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.title}</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{c.value}</div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Message sent!</h3>
                <p className="text-slate-600 mt-2">We'll get back to you within 2 business hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Send us a message</h3>
                  <p className="text-slate-500 text-sm mt-1">Fill out the form below and we'll be in touch soon.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="input-premium"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="input-premium"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">Select…</option>
                    <option>Sales inquiry</option>
                    <option>Product support</option>
                    <option>Partnership</option>
                    <option>Careers</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="input-premium"
                    placeholder="Tell us how we can help…"
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Sending…' : (<>Send Message <Send size={14} /></>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
