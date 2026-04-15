import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function OnboardingScreen() {
  const setContext = useAuthStore((s) => s.setContext);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert('Missing', 'Business name is required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.onboard({ businessName: businessName.trim() });
      setContext({
        tenant: data.tenant ?? null,
        plan: data.plan ?? null,
        subscription: data.subscription ?? null,
        permissions: data.permissions ?? [],
      });
      router.replace('/dashboard');
    } catch (err: any) {
      Alert.alert('Onboarding failed', err?.response?.data?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-2xl font-bold text-slate-900 mb-2">Tell us about your business</Text>
        <Text className="text-slate-500 mb-6">This creates your tenant workspace.</Text>

        <Text className="text-sm font-medium text-slate-700 mb-1">Business name</Text>
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Acme Retail"
          className="border border-slate-300 rounded-lg px-4 py-3 mb-6 text-slate-900"
        />

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="bg-emerald-600 rounded-lg py-3 items-center active:opacity-80 disabled:opacity-60"
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
