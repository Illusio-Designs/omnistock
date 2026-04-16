import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function RegisterScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing fields', 'Full name is required.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing fields', 'Email is required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Register the user
      await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Step 2: Auto-login since register doesn't return a token
      const { data: loginData } = await authApi.login(email.trim(), password);
      await setAuth(loginData.user, loginData.token);

      // Step 3: Fetch full context
      try {
        const { data: me } = await authApi.me();
        setContext({
          tenant: me.tenant ?? null,
          plan: me.plan ?? null,
          subscription: me.subscription ?? null,
          permissions: me.permissions ?? [],
        });
      } catch {
        // New user won't have a tenant yet — that's expected
      }

      // New users go to onboarding to create their workspace
      router.replace('/onboarding');
    } catch (err: any) {
      Alert.alert(
        'Registration failed',
        err?.response?.data?.error || err?.response?.data?.message || 'Something went wrong. Try again.'
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            className="bg-slate-900 px-8 pt-14 pb-10 rounded-b-[40px]"
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
              <Text className="text-white text-xl font-extrabold">O</Text>
            </View>
            <Text className="text-3xl font-extrabold text-white tracking-tight">
              Create account
            </Text>
            <Text className="text-slate-400 text-base mt-2 font-medium">
              Start managing your commerce today
            </Text>
          </View>

          {/* Form */}
          <View className="flex-1 px-8 pt-8">
            {/* Google sign up */}
            <Pressable
              onPress={() => {
                Alert.alert('Coming soon', 'Google sign-up will be available shortly.');
              }}
              className="flex-row items-center justify-center bg-white border border-slate-200 rounded-2xl py-3.5 mb-6 active:bg-slate-50"
              style={{
                shadowColor: '#0f172a',
                shadowOpacity: 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              <View className="w-5 h-5 mr-3 items-center justify-center">
                <Text className="text-lg font-bold">G</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-700">
                Sign up with Google
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-slate-200" />
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mx-4">
                or with email
              </Text>
              <View className="flex-1 h-px bg-slate-200" />
            </View>

            {/* Name */}
            <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Full name
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-4">
              <User size={18} color="#94a3b8" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
                className="flex-1 py-3.5 px-3 text-slate-900 text-[15px]"
              />
            </View>

            {/* Email */}
            <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Email
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-4">
              <Mail size={18} color="#94a3b8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@company.com"
                placeholderTextColor="#94a3b8"
                className="flex-1 py-3.5 px-3 text-slate-900 text-[15px]"
              />
            </View>

            {/* Password */}
            <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-6">
              <Lock size={18} color="#94a3b8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor="#94a3b8"
                className="flex-1 py-3.5 px-3 text-slate-900 text-[15px]"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="p-1"
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </Pressable>
            </View>

            {/* Submit */}
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
                  Create account
                </Text>
              )}
            </Pressable>

            {/* Switch to login */}
            <Pressable
              onPress={() => router.back()}
              className="mt-6 mb-8 items-center active:opacity-60"
            >
              <Text className="text-sm text-slate-500 font-medium">
                Already have an account?{' '}
                <Text className="text-emerald-600 font-bold">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
