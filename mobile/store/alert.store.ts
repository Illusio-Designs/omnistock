/**
 * Modal-alert state — replaces React Native's stock `Alert.alert()`
 * popup with our own branded modal. Mounted once at root via
 * <AppAlert /> in app/_layout.tsx; pushed to from anywhere by calling
 * the `appAlert(...)` helper in lib/alert.ts.
 *
 * Mimics the Alert.alert API so existing call sites can swap by name:
 *   Alert.alert('Title', 'Body', [{ text: 'OK', onPress: ... }])
 *   appAlert('Title', 'Body', [{ text: 'OK', onPress: ... }])
 */

import { create } from 'zustand';

export type AlertKind = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertItem {
  id: string;
  kind: AlertKind;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertState {
  current: AlertItem | null;
  show: (alert: Omit<AlertItem, 'id'>) => string;
  dismiss: (id?: string) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  current: null,
  show: (alert) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ current: { ...alert, id } });
    return id;
  },
  dismiss: (id) => {
    const c = get().current;
    if (!c) return;
    if (!id || c.id === id) set({ current: null });
  },
}));
