'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, Input, Textarea, Select, Badge } from '@/components/ui';
import {
  HelpCircle, MessageCircle, Mail, BookOpen, Video, Search, Send,
  Rocket, Plug, Package, ShoppingCart, Truck, Settings, ArrowRight, ExternalLink,
} from 'lucide-react';

const CATEGORIES = [
  { icon: Rocket,       title: 'Getting Started', articles: 12 },
  { icon: Plug,         title: 'Integrations',    articles: 24 },
  { icon: Package,      title: 'Products',        articles: 18 },
  { icon: ShoppingCart, title: 'Orders',          articles: 22 },
  { icon: Truck,        title: 'Shipping',        articles: 16 },
  { icon: Settings,     title: 'Settings',        articles: 10 },
];

const POPULAR = [
  'How do I connect Amazon Seller Central?',
  'How do I map SKUs between channels?',
  'How do I push inventory to all channels at once?',
  'How does auto review request work?',
  'Can I use OmniStock with my existing Shopify store?',
  'How do I cancel a shipment?',
];

const TICKETS = [
  { id: 'T-2041', subject: 'Flipkart sync keeps failing',           status: 'open',     updated: '2h ago' },
  { id: 'T-2035', subject: 'Bulk product import not working',       status: 'pending',  updated: '1d ago' },
  { id: 'T-2012', subject: 'Custom webhook signature validation',   status: 'resolved', updated: '3d ago' },
];

export default function HelpPage() {
  const [q, setQ] = useState('');
  const [ticket, setTicket] = useState({ subject: '', priority: 'normal', message: '' });

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Help Desk</h1>
          <p className="text-sm text-slate-500 mt-1">Get help, browse guides, or contact support</p>
        </div>

        {/* Hero search */}
        <Card className="p-8 md:p-10 text-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-white">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-200/40 blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="relative max-w-2xl mx-auto">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white shadow-lg items-center justify-center mb-4">
              <HelpCircle size={22} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How can we help?</h2>
            <p className="text-sm text-slate-500 mt-2">Search our help center or contact support below</p>
            <div className="relative max-w-xl mx-auto mt-6">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles, guides, tutorials…"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-lg text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 placeholder:text-slate-400"
              />
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard icon={BookOpen}     title="Documentation" description="Guides & API docs" href="/resources/help" />
          <ActionCard icon={Video}        title="Video Tutorials" description="Product walkthroughs" href="/resources/videos" />
          <ActionCard icon={MessageCircle} title="Live Chat"      description="Chat with support 9am-9pm" />
        </div>

        {/* Two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Categories + Popular */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Browse by category</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  return (
                    <button key={c.title} className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left group">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:border-emerald-200 transition-colors">
                        <Icon size={16} className="text-emerald-600" />
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{c.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wider">{c.articles} articles</div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Popular articles</h2>
              <div className="space-y-1">
                {POPULAR.map(p => (
                  <a key={p} href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50/30 transition-colors group">
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">{p}</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </Card>

            {/* Tickets */}
            <Card className="p-6">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Your tickets</h2>
              <div className="space-y-2">
                {TICKETS.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">{t.id}</span>
                        <Badge variant={t.status === 'open' ? 'rose' : t.status === 'pending' ? 'amber' : 'emerald'}>
                          {t.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1 truncate">{t.subject}</div>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap ml-3">{t.updated}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Contact form */}
          <Card className="p-6 lg:sticky lg:top-20 h-fit">
            <h2 className="font-bold text-lg text-slate-900 mb-1">Contact Support</h2>
            <p className="text-xs text-slate-500 mb-5">We usually reply within 2 hours</p>

            <div className="space-y-4">
              <Input
                label="Subject"
                value={ticket.subject}
                onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                placeholder="Brief summary of your issue"
              />
              <Select
                label="Priority"
                value={ticket.priority}
                onChange={(v) => setTicket({ ...ticket, priority: v })}
                options={[
                  { value: 'low',    label: '🟢 Low' },
                  { value: 'normal', label: '🟡 Normal' },
                  { value: 'high',   label: '🟠 High' },
                  { value: 'urgent', label: '🔴 Urgent' },
                ]}
                fullWidth
              />
              <Textarea
                label="Message"
                value={ticket.message}
                onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                placeholder="Describe the issue in detail…"
                rows={5}
              />
              <Button leftIcon={<Send size={14} />} fullWidth disabled={!ticket.subject || !ticket.message}>
                Send Message
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={13} className="text-emerald-600" />
                </div>
                <span>hello@omnistock.in</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={13} className="text-emerald-600" />
                </div>
                <span>9 AM – 9 PM IST</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ActionCard({ icon: Icon, title, description, href }: any) {
  const content = (
    <Card className="p-5 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Icon size={17} className="text-emerald-600" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          </div>
        </div>
        {href && <ExternalLink size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : <button className="text-left w-full">{content}</button>;
}
