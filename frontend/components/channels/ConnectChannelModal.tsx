'use client';

import { useEffect, useRef, useState } from 'react';
import { channelApi, oauthApi } from '@/lib/api';
import { getSchemaForType, type ChannelField } from '@/lib/channel-schemas';
import {
  X, Plug, Eye, EyeOff, CheckCircle2, XCircle, ExternalLink, Copy, Info, ShieldCheck,
} from 'lucide-react';

interface Props {
  channelId: string;
  channelType: string;
  channelName: string;
  onClose: () => void;
  onConnected: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export function ConnectChannelModal({
  channelId, channelType, channelName, onClose, onConnected,
}: Props) {
  const schema = getSchemaForType(channelType);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Webhook URL surfaced for each channel — the tenant copies this into the
  // external platform's dashboard so we receive events.
  const webhookUrl = `${API.replace(/\/api\/v1$/, '')}/api/v1/webhooks/channels/${channelId}`;

  if (!schema) {
    return (
      <Modal onClose={onClose} title={`Connect ${channelName}`}>
        <div className="p-6 text-sm text-slate-600">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-4">
            <Info size={14} className="mt-0.5" />
            <div>
              <p className="font-medium">No built-in form for {channelType}</p>
              <p className="text-xs mt-1">
                Paste raw JSON credentials below, or submit an integration request from the catalog.
              </p>
            </div>
          </div>
          <RawJsonForm channelId={channelId} onClose={onClose} onConnected={onConnected} />
        </div>
      </Modal>
    );
  }

  const update = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const toggleSecret = (k: string) => setShowSecret((p) => ({ ...p, [k]: !p[k] }));

  // ── OAuth flow (Amazon etc.) ──────────────────────────────
  const pollRef = useRef<any>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startOAuth = async () => {
    if (!schema?.oauth) return;
    setStatus('saving');
    setMessage('');
    try {
      let url = '';
      const provider = schema.oauth;
      if (provider === 'amazon') {
        const res = await oauthApi.amazonStart(channelId, values.region || 'IN');
        url = res.data.url;
      } else if (provider === 'shopify') {
        if (!values.shop) {
          setStatus('error');
          setMessage('Enter your shop domain first (e.g. mystore.myshopify.com)');
          return;
        }
        const res = await oauthApi.shopifyStart(channelId, values.shop);
        url = res.data.url;
      } else if (provider === 'flipkart') {
        const res = await oauthApi.flipkartStart(channelId);
        url = res.data.url;
      } else if (provider === 'meta') {
        const res = await oauthApi.metaStart(channelId);
        url = res.data.url;
      } else {
        throw new Error(`OAuth provider ${provider} not implemented yet`);
      }

      // Open consent in a popup
      const w = 560, h = 760;
      const left = window.screenX + (window.innerWidth - w) / 2;
      const top  = window.screenY + (window.innerHeight - h) / 2;
      popupRef.current = window.open(
        url,
        'omnistock-oauth',
        `width=${w},height=${h},left=${left},top=${top}`
      );
      if (!popupRef.current) {
        setStatus('error');
        setMessage('Popup blocked. Please allow popups for this site and retry.');
        return;
      }

      setStatus('idle');
      setMessage('Waiting for authorization…');

      // Poll the channel status until credentials land or popup closes
      pollRef.current = setInterval(async () => {
        try {
          const r = await oauthApi.status(provider, channelId);
          if (r.data.connected) {
            clearInterval(pollRef.current);
            setStatus('success');
            setMessage(`${schema.name} connected`);
            setTimeout(() => onConnected(), 1200);
            return;
          }
          if (r.data.error) {
            clearInterval(pollRef.current);
            setStatus('error');
            setMessage(r.data.error);
            return;
          }
          if (popupRef.current?.closed) {
            clearInterval(pollRef.current);
            if (status !== 'success') {
              setStatus('idle');
              setMessage('Authorization cancelled');
            }
          }
        } catch {}
      }, 2000);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.response?.data?.error || e.message);
    }
  };

  const missing = schema.fields
    .filter((f) => f.required && !values[f.key])
    .map((f) => f.label);

  const submit = async () => {
    if (missing.length) {
      setStatus('error');
      setMessage(`Missing required fields: ${missing.join(', ')}`);
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const res = await channelApi.connect(channelId, values);
      setStatus('success');
      setMessage(
        res.data?.connection?.sellerId
          ? `Connected as seller ${res.data.connection.sellerId}`
          : res.data?.message || 'Connected successfully'
      );
      setTimeout(() => onConnected(), 1200);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.response?.data?.details || e?.response?.data?.error || e.message);
    }
  };

  return (
    <Modal onClose={onClose} title={`Connect ${schema.name}`}>
      {schema.description && (
        <p className="text-sm text-slate-600 px-6 pt-4">{schema.description}</p>
      )}

      {schema.docsUrl && (
        <a
          href={schema.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-6 mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
        >
          <ExternalLink size={12} /> Official API docs
        </a>
      )}

      {schema.steps && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
            <Info size={12} /> Setup steps
          </div>
          <ol className="text-xs text-slate-600 space-y-1 list-decimal pl-4">
            {schema.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}

      <div className="p-6 space-y-4">
        {schema.fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={values[f.key] || ''}
            showSecret={!!showSecret[f.key]}
            onChange={(v) => update(f.key, v)}
            onToggle={() => toggleSecret(f.key)}
          />
        ))}

        {/* Webhook URL — sellers paste this into the external system */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Webhook URL (configure in {schema.name} dashboard)
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(webhookUrl); setMessage('Copied webhook URL'); }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            This endpoint is public and looks up your tenant from the channel id.
          </p>
        </div>
      </div>

      {status !== 'idle' && message && (
        <div className={`mx-6 mb-4 p-3 rounded-lg text-sm flex items-start gap-2 border ${
          status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          status === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          {status === 'success' ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> :
           status === 'error'   ? <XCircle size={14} className="mt-0.5 flex-shrink-0" /> : null}
          <div className="flex-1 break-all">{message}</div>
        </div>
      )}

      <div className="flex gap-2 justify-end px-6 pb-6 pt-2 border-t border-slate-100">
        <button
          onClick={onClose}
          disabled={status === 'saving'}
          className="px-4 py-2 text-slate-600 font-medium"
        >
          Cancel
        </button>
        {schema.oauth ? (
          <button
            onClick={startOAuth}
            disabled={status === 'saving' || status === 'success'}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-lg font-bold disabled:opacity-50 shadow"
          >
            <ShieldCheck size={14} />
            {status === 'success' ? 'Connected' : `Authorize with ${schema.name}`}
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={status === 'saving' || status === 'success'}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50"
          >
            <Plug size={14} />
            {status === 'saving' ? 'Testing & saving…' : status === 'success' ? 'Connected' : 'Test & Save'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Reusable pieces ─────────────────────────────────────────────
function Modal({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldRow({
  field, value, showSecret, onChange, onToggle,
}: {
  field: ChannelField;
  value: string;
  showSecret: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
}) {
  const isSecret = field.secret || field.kind === 'password';
  const inputType = isSecret && !showSecret ? 'password' : 'text';

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {field.kind === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
          >
            <option value="">Select…</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : field.kind === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-mono"
          />
        ) : (
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm pr-10"
          />
        )}
        {isSecret && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            tabIndex={-1}
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {field.help && <p className="text-[10px] text-slate-500 mt-1">{field.help}</p>}
    </div>
  );
}

// Fallback for channel types not in the schema catalog
function RawJsonForm({
  channelId, onClose, onConnected,
}: { channelId: string; onClose: () => void; onConnected: () => void }) {
  const [json, setJson] = useState('{\n  \n}');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr('');
    let parsed;
    try { parsed = JSON.parse(json); }
    catch { setErr('Invalid JSON'); return; }
    setSaving(true);
    try {
      await channelApi.connect(channelId, parsed);
      onConnected();
    } catch (e: any) {
      setErr(e?.response?.data?.details || e?.response?.data?.error || e.message);
      setSaving(false);
    }
  };

  return (
    <>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs"
      />
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancel</button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}
