// Entry shim. package.json's `main` already points at expo-router/entry,
// which is enough for Expo Go's QR-scan launch path. This file exists so
// that ANY bundle URL Metro receives (index.bundle, entry.bundle,
// .expo/.virtual-metro-entry.bundle) resolves cleanly — pre-warming the
// bundle from a browser tab via /index.bundle?platform=android used to
// fail with "Unable to resolve module ./index from .../mobile/." which
// in turn broke the Expo Go download because Metro's failed-build state
// got cached.
import 'expo-router/entry';
