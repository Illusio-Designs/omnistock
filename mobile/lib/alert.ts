/**
 * `appAlert()` — drop-in replacement for React Native's Alert.alert.
 *
 * Same signature, branded UI:
 *
 *   import { appAlert } from '@/lib/alert';
 *
 *   appAlert('Sign out?', 'You will need to sign in again.', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
 *   ]);
 *
 * Or pick a kind explicitly when there's no decision to make:
 *
 *   appAlert.success('Saved', 'Your changes are live.');
 *   appAlert.error('Could not save', 'Please try again.');
 *
 * The modal renders via <AppAlert /> mounted once at the root layout.
 */

import { useAlertStore, type AlertButton, type AlertKind } from '../store/alert.store';

const DEFAULT_BUTTONS: AlertButton[] = [{ text: 'OK', style: 'default' }];

function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  kind: AlertKind = 'info'
) {
  return useAlertStore.getState().show({
    kind,
    title,
    message,
    buttons: buttons && buttons.length ? buttons : DEFAULT_BUTTONS,
  });
}

interface AppAlertFn {
  (title: string, message?: string, buttons?: AlertButton[]): string;
  info:    (title: string, message?: string, buttons?: AlertButton[]) => string;
  success: (title: string, message?: string, buttons?: AlertButton[]) => string;
  warning: (title: string, message?: string, buttons?: AlertButton[]) => string;
  error:   (title: string, message?: string, buttons?: AlertButton[]) => string;
  confirm: (title: string, message?: string, buttons?: AlertButton[]) => string;
  dismiss: () => void;
}

export const appAlert: AppAlertFn = ((title, message, buttons) =>
  showAlert(title, message, buttons, 'info')) as AppAlertFn;

appAlert.info    = (t, m, b) => showAlert(t, m, b, 'info');
appAlert.success = (t, m, b) => showAlert(t, m, b, 'success');
appAlert.warning = (t, m, b) => showAlert(t, m, b, 'warning');
appAlert.error   = (t, m, b) => showAlert(t, m, b, 'error');
appAlert.confirm = (t, m, b) => showAlert(t, m, b, 'confirm');
appAlert.dismiss = () => useAlertStore.getState().dismiss();

export type { AlertButton, AlertKind } from '../store/alert.store';
