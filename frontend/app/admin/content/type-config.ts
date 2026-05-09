/**
 * Catalogue of every "public_content" type the marketing site renders,
 * with friendly metadata for the /admin/content UI.
 *
 * Why this lives in its own file:
 * - The admin page imports it to render the type-picker hub and to build
 *   tailored forms (which standard fields are relevant + which custom
 *   data.* fields exist).
 * - When you add a new content type to the public site, register it
 *   here so non-technical admins get a proper form instead of a raw
 *   JSON textarea.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Sparkles, Quote, Wrench, Users, Building2, Heart, History, BookOpen,
  Video, Trophy, Image, Link2, Layout, Star, Lightbulb, MessageCircleQuestion,
  HelpCircle, FileText, AlertTriangle,
} from 'lucide-react';

export type FieldKey =
  | 'title' | 'subtitle' | 'body'
  | 'icon' | 'image' | 'category' | 'href'
  | 'sortOrder' | 'isActive';

/** A custom field stored under public_content.data — rendered as a real
 *  labeled input in the admin form instead of a raw JSON blob. */
export interface DataFieldDef {
  /** Dot-path into the data object, e.g. "ctaPrimary.label" */
  key: string;
  label: string;
  type: 'string' | 'number' | 'url' | 'longtext';
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface TypeConfig {
  /** Public-content `type` column value. */
  id: string;
  /** Human-friendly type name. */
  name: string;
  /** One-line description for the hub card. */
  description: string;
  /** Where this content shows up in the live site. */
  whereUsed: string[];
  /** Icon for the hub card. */
  icon: LucideIcon;
  /** Hub category — used to group cards. */
  category: 'Landing' | 'Site navigation' | 'About' | 'Resources' | 'Help' | 'Other';
  /** Standard public_content fields this type uses. Hidden fields aren't shown
   *  in the form; the row is still saved, just with their default values. */
  fields: FieldKey[];
  /** Override the default label of a standard field for this type. */
  fieldLabels?: Partial<Record<FieldKey, string>>;
  /** Help text shown under a standard field for this type. */
  fieldHints?: Partial<Record<FieldKey, string>>;
  /** Per-type structured data.* fields shown as labeled inputs. */
  dataFields?: DataFieldDef[];
  /** Brief tip shown above the form to orient the editor. */
  tip?: string;
}

export const TYPE_CONFIG: TypeConfig[] = [
  // ── Landing page ─────────────────────────────────────────────────
  {
    id: 'HERO',
    name: 'Homepage Hero',
    description: 'The big headline section at the top of the homepage.',
    whereUsed: ['Homepage'],
    icon: Sparkles,
    category: 'Landing',
    fields: ['title', 'subtitle', 'body', 'isActive'],
    fieldLabels: {
      title: 'Headline (top line)',
      subtitle: 'Headline (gradient line)',
      body: 'Sub-headline paragraph',
    },
    fieldHints: {
      title: 'Shown as the first part of the gradient heading.',
      subtitle: 'Shown as the second, brand-coloured part.',
      body: 'A short paragraph below the headline.',
    },
    dataFields: [
      { key: 'badge', label: 'Top badge text', type: 'string', hint: 'Pill above the headline (e.g. "Now connecting 56+ channels")' },
      { key: 'ctaPrimary.label', label: 'Primary button label', type: 'string', placeholder: 'Try for Free' },
      { key: 'ctaPrimary.href', label: 'Primary button link', type: 'url', placeholder: '/onboarding' },
      { key: 'ctaSecondary.label', label: 'Secondary button label', type: 'string', placeholder: 'Schedule a Demo' },
      { key: 'ctaSecondary.href', label: 'Secondary button link', type: 'url', placeholder: '/contact' },
    ],
    tip: 'The first thing visitors see. Keep the headline short and the badge cheeky.',
  },
  {
    id: 'TESTIMONIAL',
    name: 'Testimonial',
    description: 'A quote from a happy customer with their name and role.',
    whereUsed: ['Homepage'],
    icon: Quote,
    category: 'Landing',
    fields: ['title', 'subtitle', 'body', 'sortOrder', 'isActive'],
    fieldLabels: {
      title: 'Customer name',
      subtitle: 'Job title & company',
      body: 'Quote',
    },
    dataFields: [
      { key: 'rating', label: 'Star rating (1–5)', type: 'number', min: 1, max: 5, placeholder: '5' },
      { key: 'avatar', label: 'Avatar initials override', type: 'string', hint: 'Optional. Defaults to the first letters of the customer name.' },
    ],
  },
  {
    id: 'LANDING_CHALLENGE',
    name: 'Customer challenge',
    description: 'A problem the product solves — pulled into the homepage "challenges" strip.',
    whereUsed: ['Homepage'],
    icon: AlertTriangle,
    category: 'Landing',
    fields: ['title', 'subtitle', 'icon', 'sortOrder', 'isActive'],
    fieldHints: {
      icon: 'Lucide icon name (e.g. Box, ShoppingBag, Truck).',
    },
  },
  {
    id: 'LANDING_FEATURE_TOOL',
    name: 'Feature tool',
    description: 'One of the platform tools highlighted on the homepage.',
    whereUsed: ['Homepage'],
    icon: Wrench,
    category: 'Landing',
    fields: ['title', 'subtitle', 'icon', 'sortOrder', 'isActive'],
  },
  {
    id: 'LANDING_FAQ',
    name: 'Homepage FAQ',
    description: 'Question + answer shown in the homepage FAQ section.',
    whereUsed: ['Homepage'],
    icon: MessageCircleQuestion,
    category: 'Landing',
    fields: ['title', 'body', 'sortOrder', 'isActive'],
    fieldLabels: { title: 'Question', body: 'Answer' },
  },
  {
    id: 'FEATURE',
    name: 'Features-page feature',
    description: 'A feature card on the dedicated /features page.',
    whereUsed: ['Features page'],
    icon: Star,
    category: 'Landing',
    fields: ['title', 'subtitle', 'body', 'icon', 'image', 'category', 'sortOrder', 'isActive'],
  },
  {
    id: 'SOLUTION',
    name: 'Solutions-page entry',
    description: 'A solution / use-case shown on the /solutions page.',
    whereUsed: ['Solutions page'],
    icon: Lightbulb,
    category: 'Landing',
    fields: ['title', 'subtitle', 'body', 'icon', 'image', 'href', 'sortOrder', 'isActive'],
  },

  // ── Site navigation ──────────────────────────────────────────────
  {
    id: 'NAV_LINK',
    name: 'Top navbar link',
    description: 'A link in the public site\'s top navigation bar.',
    whereUsed: ['Public navbar'],
    icon: Link2,
    category: 'Site navigation',
    fields: ['title', 'subtitle', 'icon', 'category', 'href', 'sortOrder', 'isActive'],
    fieldLabels: { title: 'Link label', subtitle: 'Tooltip / hint', category: 'Group (main, solutions, resources, company)' },
    fieldHints: {
      category: 'Determines where the link appears: "main" = top-level, the rest become dropdowns.',
      icon: 'Lucide icon name (only used in dropdown groups).',
    },
    tip: 'Avoid creating duplicates — each title appears in the navbar.',
  },
  {
    id: 'FOOTER_LINK',
    name: 'Footer link',
    description: 'A link in the public site\'s footer columns.',
    whereUsed: ['Public footer'],
    icon: Layout,
    category: 'Site navigation',
    fields: ['title', 'category', 'href', 'sortOrder', 'isActive'],
    fieldLabels: { title: 'Link label', category: 'Footer column (solutions, product, resources, company)' },
  },

  // ── About page ───────────────────────────────────────────────────
  {
    id: 'ABOUT_SECTION',
    name: 'About — section',
    description: 'A copy block on the /about page.',
    whereUsed: ['About page'],
    icon: BookOpen,
    category: 'About',
    fields: ['title', 'subtitle', 'body', 'image', 'sortOrder', 'isActive'],
  },
  {
    id: 'ABOUT_VALUE',
    name: 'About — company value',
    description: 'A "what we believe" / values card on the /about page.',
    whereUsed: ['About page'],
    icon: Heart,
    category: 'About',
    fields: ['title', 'subtitle', 'icon', 'sortOrder', 'isActive'],
  },
  {
    id: 'ABOUT_TIMELINE',
    name: 'About — timeline event',
    description: 'A milestone in the company timeline.',
    whereUsed: ['About page'],
    icon: History,
    category: 'About',
    fields: ['title', 'subtitle', 'sortOrder', 'isActive'],
    dataFields: [
      { key: 'year', label: 'Year', type: 'string', placeholder: '2025', hint: 'Shown as a small label above the milestone.' },
    ],
  },

  // ── Resources ────────────────────────────────────────────────────
  {
    id: 'RESOURCE_TILE',
    name: 'Resource tile',
    description: 'A clickable tile on the /resources hub.',
    whereUsed: ['Resources page'],
    icon: BookOpen,
    category: 'Resources',
    fields: ['title', 'subtitle', 'body', 'image', 'icon', 'category', 'href', 'sortOrder', 'isActive'],
  },
  {
    id: 'VIDEO',
    name: 'Video',
    description: 'A video card on /resources/videos.',
    whereUsed: ['Resources / videos'],
    icon: Video,
    category: 'Resources',
    fields: ['title', 'subtitle', 'image', 'sortOrder', 'isActive'],
    fieldLabels: { image: 'Thumbnail URL' },
    dataFields: [
      { key: 'url', label: 'Video URL (YouTube / Vimeo / mp4)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
      { key: 'duration', label: 'Duration', type: 'string', placeholder: '5:12' },
    ],
  },
  {
    id: 'CASE_STUDY',
    name: 'Case study',
    description: 'A success story on /resources/cases.',
    whereUsed: ['Resources / cases'],
    icon: Trophy,
    category: 'Resources',
    fields: ['title', 'subtitle', 'body', 'image', 'category', 'href', 'sortOrder', 'isActive'],
  },

  // ── Help (legacy — prefer /admin/help for FAQs) ──────────────────
  {
    id: 'HELP_CATEGORY',
    name: 'Help — category',
    description: 'A help-centre category card. Help FAQs live in /admin/help now.',
    whereUsed: ['Help centre'],
    icon: FileText,
    category: 'Help',
    fields: ['title', 'subtitle', 'icon', 'href', 'sortOrder', 'isActive'],
  },
  {
    id: 'HELP_FAQ',
    name: 'Help — FAQ (legacy)',
    description: 'Older FAQ rows. New FAQs should be added in /admin/help.',
    whereUsed: ['Help centre'],
    icon: HelpCircle,
    category: 'Help',
    fields: ['title', 'body', 'category', 'sortOrder', 'isActive'],
    tip: 'Prefer /admin/help for new FAQs — that page has a tailored editor.',
  },
];

export const TYPE_CATEGORIES: Array<TypeConfig['category']> = [
  'Landing', 'Site navigation', 'About', 'Resources', 'Help', 'Other',
];

export function getTypeConfig(id: string): TypeConfig | undefined {
  return TYPE_CONFIG.find((t) => t.id === id);
}
