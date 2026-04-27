'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Button, Badge, Card, Input, Textarea, Select, PasswordInput,
  Checkbox, Switch, FileUpload, DatePicker, Pagination, Tooltip,
  Modal, Dropdown, Skeleton, Loader, Avatar, Tabs, EmptyState,
  ConfirmDialog, useConfirm, FilterBar, FilterChips,
} from '@/components/ui';
import { toast } from '@/store/toast.store';
import {
  Plus, Save, Trash2, Mail, Phone, Lock, Send, Sparkles, Package,
  Eye, RefreshCw, MoreHorizontal, Filter, Building2,
} from 'lucide-react';

const SECTIONS = [
  { key: 'buttons',  label: 'Buttons' },
  { key: 'inputs',   label: 'Inputs' },
  { key: 'select',   label: 'Select & Dropdown' },
  { key: 'toggles',  label: 'Toggles' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'overlays', label: 'Overlays' },
  { key: 'data',     label: 'Data Display' },
  { key: 'filters',  label: 'Filters' },
  { key: 'layout',   label: 'Layout' },
] as const;

type Section = (typeof SECTIONS)[number]['key'];

export default function UiKitPage() {
  const [section, setSection] = useState<Section>('buttons');

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">UI Kit</h1>
          <p className="text-slate-500 mt-1">
            Live, interactive showcase of every shared component in <code>@/components/ui</code>.
            Use this page when designing new screens to see what's available.
          </p>
        </div>

        <Tabs value={section} onChange={setSection} items={SECTIONS.map((s) => ({ key: s.key, label: s.label }))} />

        {section === 'buttons'  && <ButtonsSection />}
        {section === 'inputs'   && <InputsSection />}
        {section === 'select'   && <SelectSection />}
        {section === 'toggles'  && <TogglesSection />}
        {section === 'feedback' && <FeedbackSection />}
        {section === 'overlays' && <OverlaysSection />}
        {section === 'data'     && <DataSection />}
        {section === 'filters'  && <FiltersSection />}
        {section === 'layout'   && <LayoutSection />}
      </div>
    </DashboardLayout>
  );
}

// ─── Section wrapper ───────────────────────────────────────────
function Demo({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="font-bold text-lg text-slate-900 mb-1">{title}</h2>
      {description && <p className="text-xs text-slate-500 mb-5">{description}</p>}
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </Card>
  );
}

// ─── Buttons ───────────────────────────────────────────────────
function ButtonsSection() {
  return (
    <div className="space-y-4">
      <Demo title="Variants" description="primary | secondary | ghost | danger | outline">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="outline">Outline</Button>
      </Demo>

      <Demo title="Sizes" description="sm | md | lg | icon">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" variant="secondary"><Plus size={14} /></Button>
      </Demo>

      <Demo title="With icons + loading">
        <Button leftIcon={<Plus size={14} />}>New</Button>
        <Button leftIcon={<Save size={14} />} variant="secondary">Save</Button>
        <Button leftIcon={<Trash2 size={14} />} variant="danger" size="sm">Delete</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button fullWidth variant="primary" leftIcon={<Send size={14} />} className="w-64">
          Full Width
        </Button>
      </Demo>
    </div>
  );
}

// ─── Inputs ────────────────────────────────────────────────────
function InputsSection() {
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [longText, setLongText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="space-y-4">
      <Demo title="Input">
        <div className="w-full max-w-md space-y-3">
          <Input label="Plain" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type something" />
          <Input label="With left icon" leftIcon={<Mail size={14} />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input label="With error" value="invalid" onChange={() => {}} error="Looks wrong" />
          <Input label="With hint" value="" onChange={() => {}} hint="A helpful note." />
          <Input label="Disabled" value="cannot edit" onChange={() => {}} disabled />
        </div>
      </Demo>

      <Demo title="PasswordInput" description="Built-in eye toggle. `showStrength` adds a meter + checks.">
        <div className="w-full max-w-md space-y-3">
          <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          <PasswordInput label="With strength meter" value={password} onChange={(e) => setPassword(e.target.value)} showStrength />
        </div>
      </Demo>

      <Demo title="Textarea">
        <div className="w-full max-w-md">
          <Textarea label="Notes" value={longText} onChange={(e) => setLongText(e.target.value)} rows={4} placeholder="Multi-line input" />
        </div>
      </Demo>

      <Demo title="DatePicker">
        <div className="w-full max-w-xs">
          <DatePicker value={date} onChange={setDate} placeholder="Pick a date" />
          <p className="text-xs text-slate-500 mt-2">Selected: {date ? date.toLocaleDateString() : 'none'}</p>
        </div>
      </Demo>

      <Demo title="FileUpload">
        <div className="w-full max-w-md">
          <FileUpload value={files} onChange={setFiles} />
        </div>
      </Demo>
    </div>
  );
}

// ─── Select & Dropdown ────────────────────────────────────────
function SelectSection() {
  const [color, setColor] = useState('emerald');
  return (
    <div className="space-y-4">
      <Demo title="Select" description="Functional API with check-marks and click-outside-to-close.">
        <div className="w-64">
          <Select
            label="Favorite color"
            value={color}
            onChange={setColor}
            options={[
              { value: 'emerald', label: 'Emerald' },
              { value: 'sky',     label: 'Sky' },
              { value: 'rose',    label: 'Rose' },
              { value: 'amber',   label: 'Amber' },
              { value: 'violet',  label: 'Violet' },
            ]}
            fullWidth
          />
          <p className="text-xs text-slate-500 mt-2">Selected: {color}</p>
        </div>
      </Demo>

      <Demo title="Dropdown" description="Action menu — items with icons, dividers, danger items.">
        <Dropdown
          trigger={
            <Button variant="secondary" size="sm" leftIcon={<MoreHorizontal size={14} />}>Actions</Button>
          }
          items={[
            { label: 'View',    icon: <Eye size={14} />,     onClick: () => toast.info('View clicked') },
            { label: 'Refresh', icon: <RefreshCw size={14} />, onClick: () => toast.info('Refresh clicked') },
            { divider: true, label: '' },
            { label: 'Delete',  icon: <Trash2 size={14} />, onClick: () => toast.error('Delete clicked'), danger: true },
          ]}
        />
      </Demo>
    </div>
  );
}

// ─── Toggles ───────────────────────────────────────────────────
function TogglesSection() {
  const [on, setOn] = useState(true);
  const [agree, setAgree] = useState(false);
  return (
    <div className="space-y-4">
      <Demo title="Switch">
        <div className="space-y-3 w-full max-w-md">
          <Switch label="Notifications" description="Send order updates by email" checked={on} onCheckedChange={setOn} />
          <Switch label="Disabled" checked={false} onCheckedChange={() => {}} disabled />
        </div>
      </Demo>

      <Demo title="Checkbox">
        <div className="space-y-3 w-full max-w-md">
          <Checkbox label="I agree to the terms" checked={agree} onCheckedChange={setAgree} />
          <Checkbox label="Disabled" checked onCheckedChange={() => {}} disabled />
        </div>
      </Demo>
    </div>
  );
}

// ─── Feedback ──────────────────────────────────────────────────
function FeedbackSection() {
  return (
    <div className="space-y-4">
      <Demo title="Badges" description="Variants for status pills.">
        <Badge>default</Badge>
        <Badge variant="emerald">emerald</Badge>
        <Badge variant="blue">blue</Badge>
        <Badge variant="amber">amber</Badge>
        <Badge variant="rose">rose</Badge>
        <Badge variant="violet">violet</Badge>
        <Badge variant="slate">slate</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge variant="emerald" dot>with dot</Badge>
      </Demo>

      <Demo title="Toast" description="Bottom-right notifications. 4 variants, auto-dismiss after 4s.">
        <Button variant="primary" onClick={() => toast.success('Saved successfully')}>Success</Button>
        <Button variant="danger" onClick={() => toast.error('Something went wrong', 'Error')}>Error</Button>
        <Button variant="secondary" onClick={() => toast.info('FYI: this is informational')}>Info</Button>
        <Button variant="outline" onClick={() => toast.warning('Heads up — check before continuing', 'Warning')}>Warning</Button>
      </Demo>

      <Demo title="Tooltip">
        <Tooltip content="Short tooltip"><Button variant="secondary" size="sm">Hover (short)</Button></Tooltip>
        <Tooltip content="This is a longer tooltip that wraps to multiple lines because we passed wrap." wrap>
          <Button variant="secondary" size="sm">Hover (wrap)</Button>
        </Tooltip>
      </Demo>

      <Demo title="Loader" description="Full spinner with optional label / fullScreen.">
        <Loader size="sm" />
        <Loader size="md" label="Loading data…" />
        <Loader size="lg" />
      </Demo>

      <Demo title="Skeleton" description="Shimmer placeholder.">
        <div className="w-full max-w-md space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Demo>

      <Demo title="EmptyState">
        <div className="w-full">
          <EmptyState
            icon={<Building2 size={28} />}
            iconBg="bg-emerald-50 text-emerald-600"
            title="No vendors yet"
            description="Add your first supplier to start creating purchase orders."
            action={<Button leftIcon={<Plus size={14} />} onClick={() => toast.info('Open new-vendor modal')}>New Vendor</Button>}
          />
        </div>
      </Demo>
    </div>
  );
}

// ─── Overlays ──────────────────────────────────────────────────
function OverlaysSection() {
  const [open, setOpen] = useState(false);
  const [confirmUi, askConfirm] = useConfirm();

  return (
    <>
      {confirmUi}
      <div className="space-y-4">
        <Demo title="Modal" description="ESC closes, click backdrop closes, body-scroll lock.">
          <Button variant="primary" onClick={() => setOpen(true)}>Open Modal</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Example modal"
            description="A demo of the shared Modal component."
            size="md"
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => { setOpen(false); toast.success('Saved'); }}>Save</Button>
              </>
            }
          >
            <p className="text-sm text-slate-600">
              Modal bodies can hold any content — forms, tables, illustrations.
            </p>
          </Modal>
        </Demo>

        <Demo title="ConfirmDialog" description="useConfirm() returns a promise that resolves true/false.">
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await askConfirm({
                title: 'Delete this item?',
                description: 'This action cannot be undone.',
                confirmLabel: 'Delete',
                variant: 'danger',
              });
              if (ok) toast.success('Deleted');
              else toast.info('Cancelled');
            }}
          >
            Trigger Confirm
          </Button>
        </Demo>
      </div>
    </>
  );
}

// ─── Data Display ──────────────────────────────────────────────
function DataSection() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  return (
    <div className="space-y-4">
      <Demo title="Avatar" description="Auto color from name hash. Sizes xs..xl, circle | rounded.">
        <Avatar name="Alice" size="xs" />
        <Avatar name="Bob"   size="sm" />
        <Avatar name="Carol" size="md" />
        <Avatar name="Dan"   size="lg" />
        <Avatar name="Eve"   size="xl" />
        <Avatar name="Frank" size="md" shape="circle" />
        <Avatar name={null}  size="md" />
      </Demo>

      <Demo title="Pagination">
        <div className="w-full">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={237}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </Demo>

      <Demo title="Tabs" description="Pill toggle. Generic over key string union; supports badges + icons.">
        <div className="w-full">
          <Tabs<'overview' | 'orders' | 'inventory'>
            value="overview"
            onChange={() => {}}
            items={[
              { key: 'overview',  label: 'Overview',  icon: <Filter size={12} /> },
              { key: 'orders',    label: 'Orders',    badge: 12 },
              { key: 'inventory', label: 'Inventory', badge: 3 },
            ]}
          />
        </div>
      </Demo>
    </div>
  );
}

// ─── Filters ───────────────────────────────────────────────────
function FiltersSection() {
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');
  const [chipStatus, setChipStatus] = useState<'' | 'open' | 'closed' | 'pending'>('');
  const [tags, setTags] = useState<string[]>(['urgent']);
  const activeCount = [status, risk].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <Demo title="FilterBar" description="Wraps a row of filter controls with active count + Clear all.">
        <div className="w-full">
          <FilterBar
            activeCount={activeCount}
            onClear={() => { setStatus(''); setRisk(''); }}
          >
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: '',          label: 'All statuses' },
                { value: 'PENDING',   label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'SHIPPED',   label: 'Shipped' },
              ]}
              size="sm"
            />
            <Select
              value={risk}
              onChange={setRisk}
              options={[
                { value: '',       label: 'All risk' },
                { value: 'LOW',    label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH',   label: 'High' },
              ]}
              size="sm"
            />
          </FilterBar>
        </div>
      </Demo>

      <Demo title="FilterChips — single-select" description="Radio-style chips. One value at a time. Optional inline counts.">
        <div className="w-full">
          <FilterChips
            value={chipStatus}
            onChange={setChipStatus}
            options={[
              { value: '',        label: 'All',     count: 142 },
              { value: 'open',    label: 'Open',    count: 23 },
              { value: 'pending', label: 'Pending', count: 7,  activeColor: 'amber' },
              { value: 'closed',  label: 'Closed',  count: 112, activeColor: 'slate' },
            ]}
          />
          <p className="text-xs text-slate-500 mt-3">Selected: <span className="font-mono">{chipStatus || '(empty)'}</span></p>
        </div>
      </Demo>

      <Demo title="FilterChips — multi-select" description="`multiple` flag toggles individual chips. value is an array.">
        <div className="w-full">
          <FilterChips
            multiple
            value={tags}
            onChange={setTags}
            options={[
              { value: 'urgent',     label: 'Urgent',     activeColor: 'rose' },
              { value: 'follow-up',  label: 'Follow-up',  activeColor: 'amber' },
              { value: 'vip',        label: 'VIP',        activeColor: 'violet' },
              { value: 'wholesale',  label: 'Wholesale',  activeColor: 'blue' },
              { value: 'returning',  label: 'Returning' },
            ]}
            size="sm"
          />
          <p className="text-xs text-slate-500 mt-3">Selected: <span className="font-mono">[{tags.join(', ')}]</span></p>
        </div>
      </Demo>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────
function LayoutSection() {
  return (
    <div className="space-y-4">
      <Demo title="Card">
        <Card className="p-5 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Sparkles size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Card title</h3>
              <p className="text-xs text-slate-500">Cards wrap related content.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Use the <code>Card</code> component as the base for stat tiles, list panels and form sections.
          </p>
        </Card>
      </Demo>
    </div>
  );
}
