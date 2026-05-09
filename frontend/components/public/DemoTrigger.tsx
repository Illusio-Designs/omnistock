'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DemoModal } from './DemoModal';
import type { LeadSource } from '@/lib/api';
import { track } from '@/lib/analytics';

interface OpenOptions {
  source?: LeadSource;
  subject?: string;
  title?: string;
  description?: string;
}

interface DemoTriggerCtx {
  open: (opts?: OpenOptions) => void;
  close: () => void;
}

const DemoTriggerContext = createContext<DemoTriggerCtx | null>(null);

export function useDemoTrigger() {
  const ctx = useContext(DemoTriggerContext);
  if (!ctx) {
    // Soft-fail in non-public contexts (admin pages etc.) so importing the hook
    // never crashes a page that hasn't mounted the provider.
    return {
      open: () => { /* noop — DemoTriggerProvider not mounted */ },
      close: () => { /* noop */ },
    };
  }
  return ctx;
}

export function DemoTriggerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOptions>({});

  const handleOpen = useCallback((o?: OpenOptions) => {
    setOpts(o || {});
    setOpen(true);
    // Fires once per CTA click so Clarity / GA can attribute which
    // surface (pricing, footer, header, etc.) drove demo opens.
    track('demo_open', {
      source: o?.source || 'demo',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo<DemoTriggerCtx>(() => ({ open: handleOpen, close: handleClose }), [handleOpen, handleClose]);

  return (
    <DemoTriggerContext.Provider value={value}>
      {children}
      <DemoModal
        open={open}
        onClose={handleClose}
        source={opts.source}
        defaultSubject={opts.subject}
        title={opts.title}
        description={opts.description}
      />
    </DemoTriggerContext.Provider>
  );
}
