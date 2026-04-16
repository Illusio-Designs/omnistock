import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateTokenCache } from '../lib/storage';
import { useAuthStore } from '../store/auth.store';
import ErrorBoundary from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    hydrateTokenCache().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [ready, hydrated]);

  if (!ready || !hydrated) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Slot />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
