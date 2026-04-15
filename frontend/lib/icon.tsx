// Resolve a lucide-react icon by name. Used by content stored in DB
// ({ icon: "Sparkles" } in a PublicContent row renders <Sparkles />).

import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FALLBACK = Icons.Circle as LucideIcon;

export function getIcon(name?: string | null): LucideIcon {
  if (!name) return FALLBACK;
  const resolved = (Icons as unknown as Record<string, LucideIcon>)[name];
  return resolved || FALLBACK;
}
