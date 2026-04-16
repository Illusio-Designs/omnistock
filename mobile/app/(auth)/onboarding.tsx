import { router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert('Missing', 'Business name is required');
      return;
    }
    if (!password && !token) {
      Alert.alert('Missing', 'Password is required to set up your workspace');
      return;
    }
    setLoading(true);
    try {
      // The onboard endpoint creates a tenant + subscription for the user
      const { data } = await authApi.onboard({
        ownerName: user?.name || 'Owner',
        email: user?.email || '',
        password: password || 'temp-not-needed',
        businessName: businessName.trim(),
      });

      // Onboard returns a new token + user + tenant
      if (data.token && data.user) {
        await setAuth(data.user, data.token);
      }

      setContext({
        tenant: data.tenant ?? null,
        plan: data.plan ?? null,
        subscription: data.subscription ?? null,
        permissions: data.permissions ?? [],
      });

      // Fetch full context after onboarding
      try {
        const { data: me } = await authApi.me();
        setContext({
          tenant: me.tenant ?? null,
          plan: me.plan ?? null,
          subscription: me.subscription ?? null,
          permissions: me.permissions ?? [],
        });
      } catch {
        // Continue even if /me fails
      }

      router.replace('/dashboard');
    } catch (err: any) {
      Alert.alert(
        'Setup failed',
        err?.response?.data?.error || err?.response?.data?.message || 'Try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="bg-slate-900 px-8 pt-16 pb-12 rounded-b-[40px]"
          style={{
            shadowColor: '#0f172a',
            shadowOpacity: 0.15,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View
            className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center mb-6"
            style={{
              shadowColor: '#10b981',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Building2 size={24} color="#fff" />
          </View>
          <Text className="text-3xl font-extrabold text-white tracking-tight">
            Set up your workspace
          </Text>
          <Text className="text-slate-400 text-base mt-2 font-medium">
            Tell us about your business to get started
          </Text>
        </View>

        {/* Form */}
        <View className="flex-1 px-8 pt-10">
          {user ? (
            <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6">
              <Text className="text-[13px] font-bold text-emerald-700">
                Signed in as {user.name} ({user.email})
              </Text>
            </View>
          ) : null}

          <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Business name
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-5">
            <Building2 size={18} color="#94a3b8" />
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Acme Retail"
              placeholderTextColor="#94a3b8"
              className="flex-1 py-4 px-3 text-slate-900 text-[15px]"
            />
          </View>

          {/* Password field — needed by the onboard endpoint to create the tenant owner */}
          <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Set a password
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-8">
            <View className="w-[18px] h-[18px] items-center justify-center">
              <Text className="text-slate-400 text-sm">*</Text>
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min. 6 characters"
              placeholderTextColor="#94a3b8"
              className="flex-1 py-4 px-3 text-slate-900 text-[15px]"
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            className="bg-emerald-600 rounded-2xl py-4 items-center active:bg-emerald-700"
            style={{
              shadowColor: '#10b981',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold tracking-wide">
                Create workspace
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
