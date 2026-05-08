'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles, Menu, X, Github, Twitter, Linkedin, ChevronDown, ArrowRight,
} from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { publicApi } from '@/lib/api';
import { getIcon } from '@/lib/icon';
import { Loader } from '@/components/ui/Loader';
import { useDemoTrigger } from '@/components/public/DemoTrigger';

interface NavLink {
  id: string;
  title: string;
  subtitle: string | null;
  href: string | null;
  icon: string | null;
  category: string | null;
  sortOrder: number;
}

interface NavGroups {
  main: NavLink[];
  solutions: NavLink[];
  resources: NavLink[];
  company: NavLink[];
}

interface FooterGroups {
  solutions: NavLink[];
  product: NavLink[];
  resources: NavLink[];
  company: NavLink[];
}

function groupBy<T extends { category: string | null }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    const k = it.category || 'default';
    (out[k] ||= []).push(it);
  }
  return out;
}

// Single in-flight promise so nav/footer only fetches once per page load
let navCache: Promise<NavLink[]> | null = null;
let footerCache: Promise<NavLink[]> | null = null;

function fetchNav() {
  if (!navCache) navCache = publicApi.content('NAV_LINK').then((r) => r.data || []).catch(() => []);
  return navCache;
}
function fetchFooter() {
  if (!footerCache) footerCache = publicApi.content('FOOTER_LINK').then((r) => r.data || []).catch(() => []);
  return footerCache;
}

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [groups, setGroups] = useState<NavGroups>({ main: [], solutions: [], resources: [], company: [] });

  useEffect(() => {
    fetchNav().then((items) => {
      const g = groupBy(items);
      setGroups({
        main:       g.main       || [],
        solutions:  g.solutions  || [],
        resources:  g.resources  || [],
        company:    g.company    || [],
      });
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B1220]/85 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Kartriq</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {/* Interleave: Home, [Solutions dropdown], Features, Pricing, [Resources], [Company]
              We render main[] in order, inserting dropdowns at anchor positions. */}
          {groups.main.map((m) => (
            <NavLinkRow key={m.id} href={m.href || '#'} current={pathname}>{m.title}</NavLinkRow>
          ))}

          {groups.solutions.length > 0 && (
            <Dropdown
              label="Solutions"
              items={groups.solutions}
              active={activeMenu === 'solutions'}
              onEnter={() => setActiveMenu('solutions')}
              onLeave={() => setActiveMenu(null)}
            />
          )}
          {groups.resources.length > 0 && (
            <Dropdown
              label="Resources"
              items={groups.resources}
              active={activeMenu === 'resources'}
              onEnter={() => setActiveMenu('resources')}
              onLeave={() => setActiveMenu(null)}
            />
          )}
          {groups.company.length > 0 && (
            <Dropdown
              label="Company"
              items={groups.company}
              active={activeMenu === 'company'}
              onEnter={() => setActiveMenu('company')}
              onLeave={() => setActiveMenu(null)}
            />
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link href="/login" className="px-3 py-2 text-sm font-semibold text-white/70 hover:text-white rounded-lg hover:bg-white/10 whitespace-nowrap transition-colors">Log in</Link>
          <NavBookDemoButton />
          <Link href="/onboarding" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md shadow-emerald-500/20 whitespace-nowrap transition-colors">
            Get Started <ArrowRight size={13} />
          </Link>
        </div>

        <button className="md:hidden p-2 text-white/70 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0B1220] px-6 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          {groups.main.map((m) => (
            <Link key={m.id} href={m.href || '#'} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-semibold text-white/80 rounded-lg hover:bg-white/10">
              {m.title}
            </Link>
          ))}
          {groups.solutions.length > 0 && <MobileGroup label="Solutions" items={groups.solutions} onClick={() => setOpen(false)} />}
          {groups.resources.length > 0 && <MobileGroup label="Resources" items={groups.resources} onClick={() => setOpen(false)} />}
          {groups.company.length > 0 && <MobileGroup label="Company" items={groups.company} onClick={() => setOpen(false)} />}
          <MobileBookDemoRow onClose={() => setOpen(false)} />
          <div className="flex gap-2 pt-3 border-t border-white/10">
            <Link href="/login" className="flex-1 justify-center inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white/80 rounded-xl bg-white/10 hover:bg-white/15 transition-colors">Log in</Link>
            <Link href="/onboarding" className="btn-primary flex-1 justify-center">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavBookDemoButton() {
  const { open } = useDemoTrigger();
  return (
    <button
      type="button"
      onClick={() => open({ source: 'demo' })}
      className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white/85 border border-white/15 hover:border-emerald-300/60 hover:bg-white/10 rounded-full whitespace-nowrap transition-colors"
    >
      Book a Demo
    </button>
  );
}

function MobileBookDemoRow({ onClose }: { onClose: () => void }) {
  const { open } = useDemoTrigger();
  return (
    <button
      type="button"
      onClick={() => { onClose(); open({ source: 'demo' }); }}
      className="w-full text-left px-3 py-2 text-sm font-semibold text-white/80 rounded-lg hover:bg-white/10"
    >
      Book a Demo
    </button>
  );
}

function NavLinkRow({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors',
        active ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
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
  items: NavLink[];
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={cn(
          'flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors',
          active ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
        )}
      >
        {label} <ChevronDown size={13} className={cn('transition-transform', active && 'rotate-180')} />
      </button>

      {active && (
        <div className="absolute top-full left-0 pt-3 w-[420px]">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/10 p-3 animate-fade-in">
            {items.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon size={16} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.subtitle}</div>
                    )}
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
  items: NavLink[];
  onClick: () => void;
}) {
  return (
    <details className="group">
      <summary className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-white/80 rounded-lg hover:bg-white/10 cursor-pointer list-none">
        {label}
        <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
      </summary>
      <div className="pl-4 space-y-0.5 py-1">
        {items.map((i) => (
          <Link
            key={i.id}
            href={i.href || '#'}
            onClick={onClick}
            className="block px-3 py-2 text-xs text-white/70 rounded-lg hover:bg-white/10"
          >
            {i.title}
          </Link>
        ))}
      </div>
    </details>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
export function PublicFooter() {
  const [groups, setGroups] = useState<FooterGroups>({ solutions: [], product: [], resources: [], company: [] });

  useEffect(() => {
    fetchFooter().then((items) => {
      const g = groupBy(items);
      setGroups({
        solutions: g.solutions || [],
        product:   g.product   || [],
        resources: g.resources || [],
        company:   g.company   || [],
      });
    });
  }, []);

  return (
    <footer className="border-t border-white/10 bg-[#0B1220] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-base text-white">Kartriq</span>
          </Link>
          <p className="text-sm text-white/60 mt-4 max-w-sm leading-relaxed">
            One platform for all your channels. Sell everywhere, ship anything, grow faster.
          </p>
          <div className="flex items-center gap-2 mt-5">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-emerald-300 hover:bg-emerald-500/15 transition-colors">
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Solutions" items={groups.solutions} />
        <FooterCol title="Product"   items={groups.product} />
        <FooterCol title="Resources" items={groups.resources} />
        <FooterCol title="Company"   items={groups.company} />
      </div>
      <div className="border-t border-white/10 py-6 px-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Kartriq. Built for the next generation of commerce.
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: NavLink[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((l) => (
          <li key={l.id}>
            <Link href={l.href || '#'} className="text-sm text-white/60 hover:text-emerald-300 transition-colors">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Loading coordination ──────────────────────────────────────────────────
// PublicLayout renders an overlay full-screen Loader until every registered
// loader (nav/footer fetch + each page's data fetch) has resolved. Pages
// register their own loading state via `usePublicLoading(key, loading)`.
type LoadingCtx = { setLoader: (key: string, loading: boolean) => void };
const PublicLoadingContext = createContext<LoadingCtx | null>(null);

export function usePublicLoading(key: string, loading: boolean) {
  const ctx = useContext(PublicLoadingContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setLoader(key, loading);
    return () => ctx.setLoader(key, false);
  }, [ctx, key, loading]);
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [loaders, setLoaders] = useState<Record<string, boolean>>({ _layout: true });

  const setLoader = useCallback((key: string, loading: boolean) => {
    setLoaders((prev) => {
      if (loading) {
        if (prev[key]) return prev;
        return { ...prev, [key]: true };
      }
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Wait for nav + footer data before clearing the layout's own loader.
  // PublicNav/PublicFooter share the same in-flight promises via navCache/footerCache,
  // so this doesn't double-fetch.
  useEffect(() => {
    Promise.all([fetchNav(), fetchFooter()])
      .catch(() => {})
      .finally(() => setLoader('_layout', false));
  }, [setLoader]);

  const isLoading = Object.keys(loaders).length > 0;
  const ctxValue = useMemo<LoadingCtx>(() => ({ setLoader }), [setLoader]);

  return (
    <PublicLoadingContext.Provider value={ctxValue}>
      <div className="min-h-screen flex flex-col bg-white">
        <PublicNav />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <Loader size="lg" />
        </div>
      )}
    </PublicLoadingContext.Provider>
  );
}
