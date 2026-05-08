'use client';

import { useEffect, useState } from 'react';
import { Search, Mail, ChevronDown, Menu, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useSearchStore } from '@/store/search.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { Avatar } from '@/components/ui/Avatar';
import { ChangelogTrigger } from '@/components/ChangelogDrawer';
import { HelpTrigger } from '@/components/HelpDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WalletPill } from '@/components/wallet/WalletPill';

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { setMobileSidebar } = useUIStore();
  const { query, setQuery, clear } = useSearchStore();
  const displayUser = user || { name: 'Dev User', role: 'SUPER_ADMIN', email: 'dev@kartriq.in' };

  // Render the platform-correct shortcut label after mount (Mac glyphs would
  // render as a missing-character box on most Windows fonts). Rendering "⌘K"
  // by default during SSR + swapping after hydration avoids hydration warnings.
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');
  useEffect(() => {
    const isMac = /Mac|iPod|iPhone|iPad/i.test(
      navigator.platform || navigator.userAgent || ''
    );
    setShortcutLabel(isMac ? '⌘K' : 'Ctrl+K');
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#0B1220]/95 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 h-16 flex items-center gap-3">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/70 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search — single visible control. Type into it to filter the
          current page (per-page useSearchStore). Press ⌘K / Ctrl+K (or
          click the kbd chip on the right) to open the global command
          palette instead. */}
      <div className="relative flex-1 max-w-xl group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-emerald-300 transition-colors" />
        <input
          placeholder={`Search this page  ·  ${shortcutLabel} for command palette`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-24 py-2.5 text-sm text-white bg-white/[0.06] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-400/60 placeholder:text-white/45 transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            aria-label={`Open command palette (${shortcutLabel})`}
            title="Open command palette"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-2 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-md shadow-inner transition-colors whitespace-nowrap"
          >
            {shortcutLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* AI */}
        <Tooltip content="Ask AI" side="bottom">
          <button className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-colors">
            <Sparkles size={12} /> Ask AI
          </button>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip content="Toggle theme (light · dark · system)" side="bottom">
          <ThemeToggle />
        </Tooltip>

        {/* What's new */}
        <Tooltip content="What's new" side="bottom">
          <ChangelogTrigger />
        </Tooltip>

        {/* Help */}
        <Tooltip content="Help & Support" side="bottom">
          <HelpTrigger />
        </Tooltip>

        {/* Wallet balance */}
        <WalletPill />

        {/* Mail */}
        <Tooltip content="Inbox" side="bottom">
          <button aria-label="Inbox" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <Mail size={17} aria-hidden="true" />
          </button>
        </Tooltip>

        {/* Avatar */}
        <Tooltip content={displayUser.name} side="bottom">
          <button aria-label={`Account menu for ${displayUser.name}`} className="ml-2 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-white/10 transition-colors">
            <Avatar name={displayUser.name} size="sm" shape="circle" />
            <ChevronDown size={14} aria-hidden="true" className="text-white/50 hidden sm:block" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
