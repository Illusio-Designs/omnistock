'use client';

import { Search, HelpCircle, Mail, ChevronDown, Menu, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useSearchStore } from '@/store/search.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { Avatar } from '@/components/ui/Avatar';
import { WalletPill } from '@/components/wallet/WalletPill';

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { setMobileSidebar } = useUIStore();
  const { query, setQuery, clear } = useSearchStore();
  const displayUser = user || { name: 'Dev User', role: 'SUPER_ADMIN', email: 'dev@kartriq.in' };

  return (
    <header className="sticky top-0 z-30 bg-[#0B1220]/95 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 h-16 flex items-center gap-3">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/70 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          placeholder="Search this page"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-2.5 text-sm text-white bg-white/[0.06] border border-white/10 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-400/60 placeholder:text-white/40 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white rounded-md"
          >
            <X size={14} />
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

        {/* Help */}
        <Tooltip content="Help & Support" side="bottom">
          <button aria-label="Help and support" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <HelpCircle size={17} aria-hidden="true" />
          </button>
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
