'use client';

import { useEffect, useRef, useState } from 'react';
import { channelApi, oauthApi } from '@/lib/api';
import { getSchemaForType, type ChannelField } from '@/lib/channel-schemas';
import {
  Plug, Eye, EyeOff, CheckCircle2, XCircle, ExternalLink, Copy, Info, ShieldCheck, HelpCircle,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';

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
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const popupRef = useRef<Window | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Webhook URL surfaced for each channel — the tenant copies this into the
  // external platform's dashboard so we receive events.
  const webhookUrl = `${API.replace(/\/api\/v1$/, '')}/api/v1/webhooks/channels/${channelId}`;

  if (!schema) {
    return (
      <Modal open onClose={onClose} title={`Connect ${channelName}`} size="md">
        <div className="text-sm text-slate-600">
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
  const startOAuth = async () => {
    if (!schema?.oauth) return;
    setStatus('saving');
    setMessage('');
    try {
      let url = '';
      const provider = schema.oauth;
      if (provider === 'amazon') {
        // For AMAZON_<REGION> variants the backend infers region from channel type;
        // only the generic AMAZON / AMAZON_SMARTBIZ types need this passed.
        const res = await oauthApi.amazonStart(channelId, values.region);
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
      } else if (provider === 'lazada') {
        const region = String(values.region || 'SG');
        const res = await oauthApi.lazadaStart(channelId, region);
        url = res.data.url;
      } else if (provider === 'shopee') {
        const region = String(values.region || 'SG');
        const res = await oauthApi.shopeeStart(channelId, region);
        url = res.data.url;
      } else if (provider === 'mercadolibre') {
        const region = String(values.region || 'AR');
        const res = await oauthApi.mercadoLibreStart(channelId, region);
        url = res.data.url;
      } else if (provider === 'allegro') {
        const sandbox = String(values.sandbox || 'false') === 'true';
        const res = await oauthApi.allegroStart(channelId, sandbox);
        url = res.data.url;
      } else if (provider === 'wish') {
        const res = await oauthApi.wishStart(channelId);
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
        'kartriq-oauth',
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
    <Modal
      open
      onClose={onClose}
      title={`Connect ${schema.name}`}
      description={schema.description}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={status === 'saving'}>
            Cancel
          </Button>
          {schema.oauth ? (
            <Button
              variant="primary"
              leftIcon={<ShieldCheck size={14} />}
              loading={status === 'saving'}
              disabled={status === 'success'}
              onClick={startOAuth}
            >
              {status === 'success' ? 'Connected' : `Authorize with ${schema.name}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              leftIcon={<Plug size={14} />}
              loading={status === 'saving'}
              disabled={status === 'success'}
              onClick={submit}
            >
              {status === 'saving' ? 'Testing & saving…' : status === 'success' ? 'Connected' : 'Test & Save'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {schema.docsUrl && (
          <a
            href={schema.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            <ExternalLink size={12} /> Official API docs
          </a>
        )}

        {schema.steps && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <Info size={12} /> Setup steps
            </div>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal pl-4">
              {schema.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
        )}

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
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs bg-slate-50"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => { navigator.clipboard.writeText(webhookUrl); setMessage('Copied webhook URL'); }}
            >
              <Copy size={14} />
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            This endpoint is public and looks up your tenant from the channel id.
          </p>
        </div>

        {status !== 'idle' && message && (
          <div className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${
            status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            status === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                   'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            {status === 'success' ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> :
             status === 'error'   ? <XCircle size={14} className="mt-0.5 flex-shrink-0" /> : null}
            <div className="flex-1 break-all">{message}</div>
          </div>
        )}
      </div>
    </Modal>
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

  const labelNode = (
    <span className="flex items-center gap-1.5">
      <span>
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {field.help && (
        <Tooltip content={field.help} side="top" wrap>
          <HelpCircle size={13} className="text-slate-400 hover:text-emerald-600 cursor-help" />
        </Tooltip>
      )}
    </span>
  );

  if (field.kind === 'select') {
    return (
      <Select
        label={labelNode}
        value={value}
        onChange={(v) => onChange(v)}
        options={field.options || []}
        placeholder={field.placeholder || 'Select…'}
        fullWidth
      />
    );
  }

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
        {labelNode}
      </label>
      <div className="relative">
        {field.kind === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="font-mono"
          />
        ) : (
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 pr-10"
          />
        )}
        {isSecret && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            tabIndex={-1}
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
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
      <Textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={8}
        className="font-mono text-xs"
      />
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} loading={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );
}
