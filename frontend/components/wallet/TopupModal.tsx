'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { billingApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
export const WALLET_CHANGED_EVENT = 'wallet:changed';

interface TopupModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance?: number;
}

export function TopupModal({ open, onClose, currentBalance }: TopupModalProps) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (amt: number) => {
    if (!amt || amt <= 0) return;
    setBusy(true);
    setError('');
    try {
      await billingApi.topupWallet(amt);
      window.dispatchEvent(new CustomEvent(WALLET_CHANGED_EVENT));
      setAmount('');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Top up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Top up wallet" size="md">
      <div className="space-y-5">
        {typeof currentBalance === 'number' && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Current balance</div>
              <div className="text-2xl font-bold text-slate-900">₹{Number(currentBalance).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Quick amounts</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <Button
                key={amt}
                variant="secondary"
                size="sm"
                onClick={() => submit(amt)}
                disabled={busy}
              >
                + ₹{amt.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Input
            label="Custom amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1500"
            min={1}
          />
        </div>

        {error && (
          <div className="text-sm text-rose-600 font-medium">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={14} />}
            onClick={() => submit(Number(amount))}
            disabled={!amount || Number(amount) <= 0}
            loading={busy}
          >
            Top up
          </Button>
        </div>
      </div>
    </Modal>
  );
}
