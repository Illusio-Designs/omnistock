import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  /** Per-group collapsed flags for the sidebar nav. true = collapsed. */
  navGroupCollapsed: Record<string, boolean>;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  toggleNavGroup: (label: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      navGroupCollapsed: {},
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
      toggleNavGroup: (label) =>
        set((s) => ({
          navGroupCollapsed: { ...s.navGroupCollapsed, [label]: !s.navGroupCollapsed[label] },
        })),
    }),
    {
      name: 'kartriq-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        navGroupCollapsed: s.navGroupCollapsed,
      }),
    }
  )
);
