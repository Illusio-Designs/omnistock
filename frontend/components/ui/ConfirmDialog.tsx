'use client';

import { ReactNode, useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

type ConfirmVariant = 'danger' | 'primary';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

/**
 * Styled replacement for `window.confirm()`. Render at the page level
 * with `open` driven by state, OR use the `useConfirm()` imperative hook.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          variant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
        }`}>
          <AlertTriangle size={18} />
        </div>
        <div className="text-sm text-slate-600 leading-relaxed">
          {description || 'Are you sure you want to continue? This action cannot be undone.'}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Imperative API: returns `[ui, confirm]`. Drop `ui` at the bottom of the
 * page; call `await confirm({ title, description, ... })` from any handler
 * to get a boolean back.
 *
 *   const [confirmUi, confirm] = useConfirm();
 *   const ok = await confirm({ title: 'Delete?' });
 *   if (ok) doIt();
 *   return <>{confirmUi}{...page}</>;
 */
export function useConfirm() {
  const [state, setState] = useState<
    | { open: true; props: Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>; resolve: (v: boolean) => void }
    | { open: false }
  >({ open: false });
  const [loading, setLoading] = useState(false);

  const confirm = useCallback(
    (props: Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm' | 'loading'>) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, props, resolve });
      }),
    []
  );

  const close = (result: boolean) => {
    if (state.open) state.resolve(result);
    setState({ open: false });
    setLoading(false);
  };

  const ui = state.open ? (
    <ConfirmDialog
      {...state.props}
      open
      loading={loading}
      onClose={() => close(false)}
      onConfirm={async () => {
        setLoading(true);
        // Resolve true; the caller decides what to do next.
        // Loading state stays true until the dialog re-renders closed.
        close(true);
      }}
    />
  ) : null;

  return [ui, confirm] as const;
}
