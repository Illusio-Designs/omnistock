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
  const displayUser = user || { name: 'Dev User', role: 'SUPER_ADMIN', email: 'dev@uniflo.in' };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200 px-4 md:px-6 h-16 flex items-center gap-3">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search this page"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 placeholder:text-slate-400 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* AI */}
        <Tooltip content="Ask AI" side="bottom">
          <button className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-colors">
            <Sparkles size={12} /> Ask AI
          </button>
        </Tooltip>

        {/* Help */}
        <Tooltip content="Help & Support" side="bottom">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
            <HelpCircle size={17} />
          </button>
        </Tooltip>

        {/* Wallet balance */}
        <WalletPill />

        {/* Mail */}
        <Tooltip content="Inbox" side="bottom">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
            <Mail size={17} />
          </button>
        </Tooltip>

        {/* Avatar */}
        <Tooltip content={displayUser.name} side="bottom">
          <button className="ml-2 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-slate-50 transition-colors">
            <Avatar name={displayUser.name} size="sm" shape="circle" />
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
