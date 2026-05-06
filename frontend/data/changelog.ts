// In-app changelog entries. Edit this file as part of every release.
//
// `id` is a stable string used to track which entries the current user has
// already seen (we compare against entries[0].id in localStorage). Keep
// entries sorted newest-first.
//
// `tag` controls the colour of the badge:
//   feature  → emerald
//   fix      → blue
//   security → rose
//   improve  → violet

export type ChangelogTag = 'feature' | 'fix' | 'security' | 'improve';

export interface ChangelogEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  tag: ChangelogTag;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-05-06-roles',
    date: '2026-05-06',
    title: 'Custom roles — refreshed',
    tag: 'improve',
    highlights: [
      'Plan-limit indicator on the Roles tab tells you how many custom roles you have left',
      'Search permissions, select an entire module at once, or clone an existing role to build a variant',
      'Each role card now previews its top permissions and shows how many users hold it',
      'Friendly empty state guides admins through creating their first custom role',
    ],
  },
  {
    id: '2026-05-06-invites',
    date: '2026-05-06',
    title: 'Magic-link team invitations',
    tag: 'feature',
    highlights: [
      'Invite teammates from Settings → Team without picking a password for them',
      'Recipients land on a branded /accept-invite page that shows the workspace name + their email before the password prompt',
      'Pending invites show a "Pending invite" pill in the team list with a Resend button',
      'Invite links expire after 7 days; old links are blocked from overwriting an existing password',
    ],
  },
  {
    id: '2026-05-06-audit',
    date: '2026-05-06',
    title: 'Activity log for your workspace',
    tag: 'feature',
    highlights: [
      'New /audit page lists every authenticated change made in your tenant',
      'Filter by action, search by user / path / resource id, click any row to inspect metadata',
      'Useful for security reviews and compliance — accessible from the sidebar under Operations',
    ],
  },
  {
    id: '2026-05-06-cmdk',
    date: '2026-05-06',
    title: 'Command palette (⌘K / Ctrl+K)',
    tag: 'feature',
    highlights: [
      'Press ⌘K from anywhere to navigate, run quick actions, or search products / orders / customers',
      '↑↓ to move, Enter to open, Esc to close',
      'Topbar gains a clickable shortcut button next to Ask AI',
    ],
  },
  {
    id: '2026-05-06-revenue',
    date: '2026-05-06',
    title: 'Trial banner, usage page, dunning, plan proration',
    tag: 'feature',
    highlights: [
      'Trial banner counts down inside the dashboard when ≤ 7 days remain',
      'New /usage page shows progress bars per metric (SKUs, orders, users, channels, warehouses)',
      'Plan upgrade / downgrade now pro-rates against your wallet on the spot',
      'Failed-payment dunning emails fire at day 1 / 3 / 7 / 14 before suspension',
      'New email templates: invite, password reset, payment failed, plan-limit alert, ticket reply',
    ],
  },
  {
    id: '2026-05-06-compliance',
    date: '2026-05-06',
    title: 'Two-factor auth, data export, account deletion',
    tag: 'security',
    highlights: [
      'Enable TOTP 2FA from Settings → Security; QR-scan with any authenticator app',
      'Download a JSON bundle of every tenant-scoped row from Settings → Data & Privacy',
      'Delete your account with password (or email) confirmation; PII is scrubbed immediately',
      'Cookie consent banner now gates Google Analytics, Facebook Pixel, and Microsoft Clarity',
      'Webhook signatures now verify against the original raw request body',
      'Payment writes accept an `Idempotency-Key` header to prevent double-charges on retries',
    ],
  },
  {
    id: '2026-05-06-analytics',
    date: '2026-05-06',
    title: 'Founder analytics + tracking config',
    tag: 'feature',
    highlights: [
      'New /admin/analytics page lists GA4, Facebook Pixel, and Microsoft Clarity status',
      '/admin/settings gains Tracking and Maintenance tabs so IDs can be edited from the UI',
    ],
  },
];
