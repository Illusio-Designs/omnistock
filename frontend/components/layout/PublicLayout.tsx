'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles, Menu, X, Github, Twitter, Linkedin, ChevronDown, ArrowRight,
  Package, ShoppingCart, Warehouse, Truck, RefreshCcw, BarChart3, Globe,
  BookOpen, FileText, Video, HelpCircle, Users, Briefcase,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// ── Dropdown content definitions ────────────────────────────────────────────
const SOLUTIONS = [
  { label: 'Multi-channel Selling', href: '/solutions#multichannel', icon: Globe,      description: 'Sell on Amazon, Flipkart, Myntra & 50+ more' },
  { label: 'Inventory Management',  href: '/solutions#inventory',    icon: Package,    description: 'Real-time stock across every warehouse' },
  { label: 'Order Management',      href: '/solutions#orders',       icon: ShoppingCart, description: 'Unified inbox for every order' },
  { label: 'Warehouse Operations',  href: '/solutions#warehouse',    icon: Warehouse,  description: 'Pick, pack, ship from any location' },
  { label: 'Shipping & Logistics',  href: '/solutions#shipping',     icon: Truck,      description: '16+ courier partners in one API' },
  { label: 'Returns & Refunds',     href: '/solutions#returns',      icon: RefreshCcw, description: 'Automated RMA workflows' },
  { label: 'Reports & Analytics',   href: '/solutions#analytics',    icon: BarChart3,  description: 'AI-powered business insights' },
];

const RESOURCES = [
  { label: 'Blog',        href: '/resources/blog',    icon: BookOpen,    description: 'Commerce tips & trends' },
  { label: 'Case Studies',href: '/resources/cases',   icon: FileText,    description: 'How brands grew with OmniStock' },
  { label: 'Help Center', href: '/resources/help',    icon: HelpCircle,  description: 'Guides & documentation' },
  { label: 'Webinars',    href: '/resources/videos',  icon: Video,       description: 'Live product demos' },
];

const COMPANY = [
  { label: 'About',    href: '/about',    icon: Sparkles,  description: 'Our mission & story' },
  { label: 'Careers',  href: '/about#careers', icon: Briefcase, description: "We're hiring" },
  { label: 'Contact',  href: '/contact',  icon: Users,      description: 'Get in touch' },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">OmniStock</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" current={pathname}>Home</NavLink>

          <Dropdown
            label="Solutions"
            items={SOLUTIONS}
            active={activeMenu === 'solutions'}
            onEnter={() => setActiveMenu('solutions')}
            onLeave={() => setActiveMenu(null)}
          />

          <NavLink href="/features" current={pathname}>Features</NavLink>
          <NavLink href="/pricing" current={pathname}>Pricing</NavLink>

          <Dropdown
            label="Resources"
            items={RESOURCES}
            active={activeMenu === 'resources'}
            onEnter={() => setActiveMenu('resources')}
            onLeave={() => setActiveMenu(null)}
          />

          <Dropdown
            label="Company"
            items={COMPANY}
            active={activeMenu === 'company'}
            onEnter={() => setActiveMenu('company')}
            onLeave={() => setActiveMenu(null)}
          />
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md shadow-emerald-500/20 transition-colors">
            Get Started <ArrowRight size={13} />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100">Home</Link>
          <MobileGroup label="Solutions" items={SOLUTIONS} onClick={() => setOpen(false)} />
          <Link href="/features" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100">Features</Link>
          <Link href="/pricing" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100">Pricing</Link>
          <MobileGroup label="Resources" items={RESOURCES} onClick={() => setOpen(false)} />
          <MobileGroup label="Company" items={COMPANY} onClick={() => setOpen(false)} />
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Link href="/login" className="btn-secondary flex-1 justify-center">Log in</Link>
            <Link href="/dashboard" className="btn-primary flex-1 justify-center">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
        active ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      )}
    >
      {children}
    </Link>
  );
}

function Dropdown({
  label, items, active, onEnter, onLeave,
}: {
  label: string;
  items: Array<{ label: string; href: string; icon: any; description: string }>;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={cn(
          'flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
          active ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        )}
      >
        {label} <ChevronDown size={13} className={cn('transition-transform', active && 'rotate-180')} />
      </button>

      {active && (
        <div className="absolute top-full left-0 pt-3 w-[420px]">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/10 p-3 animate-fade-in">
            {items.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon size={16} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileGroup({
  label, items, onClick,
}: {
  label: string;
  items: Array<{ label: string; href: string; icon: any }>;
  onClick: () => void;
}) {
  return (
    <details className="group">
      <summary className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer list-none">
        {label}
        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
      </summary>
      <div className="pl-4 space-y-0.5 py-1">
        {items.map(i => (
          <Link
            key={i.href}
            href={i.href}
            onClick={onClick}
            className="block px-3 py-2 text-xs text-slate-600 rounded-lg hover:bg-slate-100"
          >
            {i.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-base text-slate-900">OmniStock</span>
          </Link>
          <p className="text-sm text-slate-500 mt-4 max-w-sm leading-relaxed">
            One platform for all your channels. Sell everywhere, ship anything, grow faster.
          </p>
          <div className="flex items-center gap-2 mt-5">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Solutions" links={[
          { label: 'Multi-channel', href: '/solutions#multichannel' },
          { label: 'Inventory',    href: '/solutions#inventory' },
          { label: 'Orders',       href: '/solutions#orders' },
          { label: 'Shipping',     href: '/solutions#shipping' },
          { label: 'Analytics',    href: '/solutions#analytics' },
        ]} />
        <FooterCol title="Product" links={[
          { label: 'Features',  href: '/features' },
          { label: 'Channels',  href: '/dashboard/channels' },
          { label: 'Pricing',   href: '/pricing' },
          { label: 'Changelog', href: '#' },
          { label: 'Roadmap',   href: '#' },
        ]} />
        <FooterCol title="Resources" links={[
          { label: 'Blog',         href: '/resources/blog' },
          { label: 'Case Studies', href: '/resources/cases' },
          { label: 'Help Center',  href: '/resources/help' },
          { label: 'API Docs',     href: '#' },
          { label: 'Status',       href: '#' },
        ]} />
        <FooterCol title="Company" links={[
          { label: 'About',    href: '/about' },
          { label: 'Careers',  href: '/about#careers' },
          { label: 'Contact',  href: '/contact' },
          { label: 'Privacy',  href: '#' },
          { label: 'Terms',    href: '#' },
        ]} />
      </div>
      <div className="border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} OmniStock. Built for the next generation of commerce.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
