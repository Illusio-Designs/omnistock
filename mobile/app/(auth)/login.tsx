import { router } from 'expo-router';
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

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim(), password);
      await setAuth(data.user, data.token);
      setContext({
        tenant: data.tenant ?? null,
        plan: data.plan ?? null,
        subscription: data.subscription ?? null,
        permissions: data.permissions ?? [],
      });
      if (data.user?.tenantId || data.user?.isPlatformAdmin) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    } catch (err: any) {
      Alert.alert('Login failed', err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-6 justify-center"
      >
        <Text className="text-3xl font-bold text-slate-900 mb-2">OmniStock</Text>
        <Text className="text-slate-500 mb-8">Sign in to continue</Text>

        <Text className="text-sm font-medium text-slate-700 mb-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900"
        />

        <Text className="text-sm font-medium text-slate-700 mb-1">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          className="border border-slate-300 rounded-lg px-4 py-3 mb-6 text-slate-900"
        />

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="bg-emerald-600 rounded-lg py-3 items-center active:opacity-80 disabled:opacity-60"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Sign in</Text>
          )}
        </Pressable>

        <View className="mt-6 items-center">
          <Text className="text-slate-500 text-sm">
            Mobile access to your OmniStock tenant
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
