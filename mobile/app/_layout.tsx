import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateTokenCache, tokenStorage } from '../lib/storage';
import { useAuthStore } from '../store/auth.store';
import ErrorBoundary from '../components/ErrorBoundary';
import AnimatedSplash from '../components/SplashScreen';
import IntroScreen from '../components/IntroScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    (async () => {
      await hydrateTokenCache();
      const seen = await tokenStorage.get('intro-seen');
      if (!seen) setShowIntro(true);
      setIntroChecked(true);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [ready, hydrated]);

  const onSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const onIntroFinish = useCallback(async () => {
    await tokenStorage.set('intro-seen', 'true');
    setShowIntro(false);
  }, []);

  if (!ready || !hydrated) return null;

  // Show custom animated splash
  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <AnimatedSplash onFinish={onSplashFinish} />
      </>
    );
  }

  // Show intro slides on first launch
  if (showIntro && introChecked) {
    return (
      <>
        <StatusBar style="light" />
        <IntroScreen onFinish={onIntroFinish} />
      </>
    );
  }

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
