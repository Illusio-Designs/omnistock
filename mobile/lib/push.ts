// Push notifications — Expo Notifications wrapper.
//
// Flow:
//   1. registerForPushAsync()  — runs on app boot. Asks the OS for
//      permission, fetches the Expo push token, sends it to the server
//      via POST /devices/register so backend can target this device.
//   2. Notification handler   — set globally so foreground notifications
//      show as a banner (otherwise they're silent on iOS).
//   3. Tap handler            — uses expo-router to navigate to whatever
//      `data.path` the server attached, e.g. "/orders?id=abc123".
//
// We DON'T store the token in SecureStore — fresh tokens are cheap on each
// boot, and sometimes Expo / FCM rotates them anyway. The server keeps the
// authoritative copy keyed by (userId, deviceId).

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { devicesApi } from './api';

// Foreground display behaviour — without this, iOS swallows banners while
// the app is open which is almost always wrong UX.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Legacy (pre-SDK 51) field kept for Expo Go compatibility
    shouldShowAlert: true,
  }),
});

let registered = false;

export async function registerForPushAsync(): Promise<string | null> {
  // Push isn't supported on simulators or Expo Web. Bail quietly — the
  // calling code shouldn't have to know.
  if (!Device.isDevice || Platform.OS === 'web') return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      status = ask.status;
    }
    if (status !== 'granted') return null;

    // Android needs a default channel for any notification to show
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06D4B8',
      });
    }

    const tokenObj = await Notifications.getExpoPushTokenAsync();
    const token = tokenObj.data;
    if (!token) return null;

    // Send to backend — best-effort, retried on next boot if it fails
    try {
      await devicesApi.register({
        token,
        platform: Platform.OS,
        deviceName: Device.modelName || Device.deviceName || null,
      });
    } catch {
      // Network / 4xx — token will re-register on next launch
    }
    return token;
  } catch {
    return null;
  }
}

let tapSubscription: Notifications.Subscription | null = null;

/**
 * Wire the tap → route handler. Called once from RootLayout.
 *
 * Server attaches `{ data: { path: "/orders?id=abc" } }` to every push so
 * the client knows where to navigate. If `path` is missing we fall back
 * to /dashboard.
 */
export function attachNotificationTapHandler() {
  if (tapSubscription) return tapSubscription;
  tapSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification.request.content.data as { path?: string } | undefined;
      const path = data?.path;
      if (path && typeof path === 'string') router.push(path as any);
      else router.push('/dashboard' as any);
    } catch {
      router.push('/dashboard' as any);
    }
  });
  return tapSubscription;
}

export function detachNotificationTapHandler() {
  if (tapSubscription) {
    tapSubscription.remove();
    tapSubscription = null;
  }
}

/**
 * Idempotent boot helper — call once from RootLayout. Safe to call
 * repeatedly thanks to the `registered` guard; the underlying Expo APIs
 * are also idempotent.
 */
export async function bootstrapPush() {
  if (registered) return;
  registered = true;
  attachNotificationTapHandler();
  // Permissions prompt on first launch is rude — defer until the user
  // is signed in. We fire-and-forget; failure is silent.
  registerForPushAsync().catch(() => {});
}
