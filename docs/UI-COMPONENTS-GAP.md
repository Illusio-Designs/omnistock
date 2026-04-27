# UI Components Audit & Gap Report

This audit walks every page under `frontend/app/` and reusable component under
`frontend/components/` and answers two questions:

1. Where are we still using raw HTML form/UI primitives that already have a
   shared replacement in `frontend/components/ui/`?
2. Which recurring UI patterns *need* a shared component but don't have one yet?

The goal is a fully-converged design system: every form input, button, modal,
and pill comes from `components/ui/` with consistent styling, focus rings,
spacing, and a11y. Anything page-specific (sidebar, topbar, channel-card
gradients) is intentionally bespoke and out of scope.

---

## Existing shared components (17)

| Component        | File                                | Notes |
|------------------|-------------------------------------|-------|
| `Button`         | `components/ui/Button.tsx`          | 5 variants × 4 sizes, `loading`, icons |
| `Badge`          | `components/ui/Badge.tsx`           | Status pill primitive |
| `Card`           | `components/ui/Card.tsx`            | Plus `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter` |
| `Skeleton`       | `components/ui/Skeleton.tsx`        | Loading shimmer |
| `Loader`         | `components/ui/Loader.tsx`          | Inline spinner |
| `DatePicker`     | `components/ui/DatePicker.tsx`      | Single-date popover |
| `Pagination`     | `components/ui/Pagination.tsx`      | Page nav |
| `Input`          | `components/ui/Input.tsx`           | Text/number/email; `leftIcon`, `rightIcon`, `error`, `hint` |
| `Textarea`       | `components/ui/Input.tsx` (named export) | Multi-line counterpart of `Input` |
| `PasswordInput`  | `components/ui/PasswordInput.tsx`   | Strength meter, show/hide eye |
| `FileUpload`     | `components/ui/FileUpload.tsx`      | Drag-and-drop, file list |
| `Select`         | `components/ui/Select.tsx`          | Static-options popover |
| `Dropdown`       | `components/ui/Dropdown.tsx`        | Generic anchored menu |
| `Modal`          | `components/ui/Modal.tsx`           | Sized dialog with footer slot |
| `Switch`         | `components/ui/Switch.tsx`          | Boolean toggle |
| `Checkbox`       | `components/ui/Checkbox.tsx`        | With optional `label` + `description` |
| `Tooltip`        | `components/ui/Tooltip.tsx`         | Text-only tooltip |

---

## Native elements eliminated in this pass

The codebase was already largely converged thanks to prior passes — only three
straggler elements remained outside the documented skip list:

| File | Change |
|---|---|
| `frontend/app/dashboard/team/page.tsx:192` | `<Input type="password">` → `<PasswordInput>` (added import) |
| `frontend/components/channels/ConnectChannelModal.tsx:246-258` | Webhook URL `<input readOnly>` → `<Input readOnly>` |
| `frontend/components/channels/ConnectChannelModal.tsx:329-335` | Field-row `<textarea>` (non-secret JSON-style) → `<Textarea>` |
| `frontend/components/channels/ConnectChannelModal.tsx:382-387` | `RawJsonForm` `<textarea>` → `<Textarea>` |
| `frontend/components/channels/ConnectChannelModal.tsx` (imports) | Added `Input, Textarea` from `@/components/ui/Input` |

Total: **4 conversions across 2 files**.

### Items intentionally left alone (per skip list)

- `app/onboarding/page.tsx` `<input>` `Field` component — onboarding skipped.
- `app/login/page.tsx` email `<input>` — login skipped.
- `app/contact/page.tsx` `<input>`, `<textarea>`, `<select>` — marketing page skipped.
- `app/admin/settings/page.tsx:162` secret `<input type="password|text">` with
  isSet/show toggle — flagged in skip list as bespoke secret-toggle pattern.
- `frontend/components/channels/ConnectChannelModal.tsx` `<input>` field row
  with eye-icon secret toggle (mirrors the admin/settings pattern).
- `frontend/components/layout/Topbar.tsx` `<input>` — global search bar, intentional bespoke styling.
- `frontend/components/ui/Pagination.tsx` `<select>` — internal page-size selector inside the shared component itself.
- All tab-pill `<button>` clusters (team, settings, admin/settings) — intentional toggle UI.

There were **0** native `<input type="checkbox|file|date|radio|range|color">`
in the entire app. There were **0** native `<select>` outside the marketing
contact page and Pagination's internal page-size picker.

---

## Missing shared components (Task 2 gap analysis)

### Priority legend
- **HIGH** = used in 5+ places — building this pays back immediately
- **MEDIUM** = 2-4 places
- **LOW** = 1 place — only build if it has long-term value

| # | Component | Hand-rolled at | Proposed API | Priority |
|---|---|---|---|---|
| 1 | **`ConfirmDialog`** | `app/admin/seo/page.tsx:42`, `app/admin/plans/page.tsx:27`, `app/admin/content/page.tsx:62`, `app/admin/blog/page.tsx:27`, `app/help/[id]/page.tsx:70`, `app/dashboard/team/page.tsx:71`, `app/dashboard/team/page.tsx:250` (all use `window.confirm`) | `<ConfirmDialog open title="..." description="..." confirmLabel="Delete" variant="danger" onConfirm={fn} onClose={fn} />` plus an imperative `confirm({...})` helper that returns a `Promise<boolean>` | **HIGH** (7 occurrences, all native browser `confirm()` — accessibility & visual-consistency risk) |
| 2 | **`Toast` / `Notification`** | `dashboard/billing/page.tsx:67-132` (`setMsg` + colored banner), `components/channels/ConnectChannelModal.tsx:264-274` (status banner), several pages render an inline `bg-emerald-50 / bg-rose-50` strip after save | `toast.success(msg)`, `toast.error(msg)` via a portal-mounted `<ToastProvider>`. Auto-dismiss after 4s, stack support | **HIGH** (replaces the recurring `setMsg/setMessage/setError` + colored banner pattern in 13+ files) |
| 3 | **`Tabs`** | `app/dashboard/team/page.tsx:24-39`, `app/admin/settings/page.tsx:92-107`, `app/settings/page.tsx:144-163` (vertical-list tabs), `app/dashboard/billing/page.tsx` (pay-as-you-go tab) | `<Tabs value={tab} onChange={setTab} items={[{key,label,icon}]} variant="pills" \| "vertical" />` | **HIGH** (4+ pages each rolls its own pill cluster) |
| 4 | **`EmptyState`** | `warehouses:97`, `vendors:102`, `customers:121`, `orders:221`, `invoices:174`, `inventory:222`, `products:122`, `shipments:160`, `resources/videos:56`, `resources/blog:88`, `channels/requests:67`, `admin/content:117` | `<EmptyState icon={Icon} title="No orders yet" description="..." action={<Button>...</Button>} />` | **HIGH** (12+ occurrences, each hand-rolling layout) |
| 5 | **`Avatar`** | `app/dashboard/page.tsx:198`, `app/customers/page.tsx:87,131`, `app/vendors/page.tsx:55`, `app/warehouses/page.tsx:57`, `app/settings/page.tsx:175`, `app/admin/settings/page.tsx:112` | `<Avatar name="Acme Corp" size="md" src={url?} />` — auto-derives initials and stable gradient from name | **HIGH** (7+ occurrences of the gradient-bg-with-initial pattern) |
| 6 | **`Stat` / `MetricCard`** | `app/dashboard/page.tsx:79+` (3 stat cards inline), each list page header has 3-4 stat-tile cards with icon + value + delta arrow | `<MetricCard label="Revenue" value={...} delta={+12.4} icon={Wallet} />` | **MEDIUM** (used on 3-4 pages but each instance is a 30-line block) |
| 7 | **`Combobox` / `Autocomplete`** | Searchable variant of `<Select>` is missing — orders SKU picker, customer picker in invoices, vendor picker on PO forms all currently render a plain `<Select>` with the entire dataset which doesn't scale past ~50 items | `<Combobox value={id} onChange={setId} options={[]} onSearch={text => fetchOptions(text)} renderOption={...} />` | **MEDIUM** (will be needed as soon as a tenant has >50 customers/products) |
| 8 | **`MultiSelect`** | `app/dashboard/team/page.tsx:207-220` role pill toggles, `app/dashboard/team/page.tsx:347-367` permission pill toggles | `<MultiSelect value={ids} onChange={setIds} options={[]} renderTag={...} />` or compose existing `Checkbox` into a `<CheckboxGroup>` | **MEDIUM** (2 hand-rolled instances in team page) |
| 9 | **`StatusPill` / `FilterChips`** | Status filter rows in `app/orders/page.tsx`, `app/admin/tickets/page.tsx`, `app/channels/page.tsx`, `app/products/page.tsx` (each renders a list of buttons with `bg-emerald-500 text-white` when active and `bg-slate-100 text-slate-600` otherwise) | `<FilterChips value={status} onChange={setStatus} items={[{key,label,count?}]} />` — could share implementation with `Tabs` | **MEDIUM** (4 pages currently each duplicate the same JSX) |

### Won't build (deliberately)

| Component | Reason |
|---|---|
| **`RadioGroup` / `Radio`** | Zero native `<input type="radio">` exist anywhere in `frontend/`. Every "pick one of N" UI uses pill toggles (which would be served by `Tabs` / `FilterChips` above). Build only if a future form actually needs radio semantics. |
| **`Slider` / `RangeSlider`** | Zero `<input type="range">` in the app. |
| **`ColorPicker`** | Zero `<input type="color">` in the app. |
| **`Drawer` / `Sheet`** | The single `role="dialog"` reference is the mobile sidebar overlay (`components/layout/Sidebar.tsx`) — already bespoke for layout reasons. No second use case justifies a generic `Drawer`. |
| **`Breadcrumb`** | No breadcrumb pattern exists in the codebase today; `DashboardLayout` puts page titles in an `<h1>` instead. Build only when a route hierarchy actually demands it. |
| **`Popover`** | `Dropdown` and `Tooltip` already cover the two existing use cases (anchored menus and text hints). A generic `Popover` would overlap with both — defer until a third distinct use case appears. |

---

## How to add a new shared component (4-step recipe)

1. **Create the file** under `frontend/components/ui/<Name>.tsx`. Mark it
   `'use client'` if it has state, refs, or event handlers. Follow the
   surrounding style: `forwardRef` for inputs, `cn()` from `@/lib/utils` for
   className composition, emerald-500 focus rings, `rounded-xl` corners,
   `text-xs font-bold uppercase tracking-wider` labels.
2. **Export it from the barrel** in `frontend/components/ui/index.ts` so pages
   can `import { ConfirmDialog } from '@/components/ui'`.
3. **Convert one real caller** in a single page so the component is exercised
   end-to-end. Don't ship a component with zero callers.
4. **Migrate the rest in a follow-up pass.** Grep for the hand-rolled pattern
   (e.g. `window\.confirm`, `setMsg\(.+(success|saved)`, `bg-gradient-to-br
   from-emerald-400.*flex items-center justify-center text-white font-bold`)
   and replace each occurrence. Add the component to this doc's "Existing
   shared components" table and remove its row from "Missing".
