import { Link, router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
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
import { GoogleIcon } from '../../components/GoogleIcon';
import { authApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setContext = useAuthStore((s) => s.setContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const fetchContextAndNavigate = async (loginUser: any, token: string) => {
    try {
      const { data: me } = await authApi.me();
      // Refresh user from /me (has latest tenantId, role, etc.)
      await setAuth(
        {
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role,
          tenantId: me.tenantId ?? null,
          isPlatformAdmin: !!me.isPlatformAdmin,
          avatar: me.avatar ?? null,
        },
        token
      );
      setContext({
        tenant: me.tenant ?? null,
        plan: me.plan ?? null,
        subscription: me.subscription ?? null,
        permissions: me.permissions ?? [],
      });
      if (me.tenantId || me.isPlatformAdmin) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    } catch {
      // /auth/me may fail if user has no tenant yet
      if (loginUser?.tenantId || loginUser?.isPlatformAdmin) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  };

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim(), password);
      await setAuth(data.user, data.token);
      await fetchContextAndNavigate(data.user, data.token);
    } catch (err: any) {
      Alert.alert(
        'Login failed',
        err?.response?.data?.error || err?.response?.data?.message || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Placeholder: In production, use expo-auth-session to get Google ID token
      // then send it to authApi.google(credential)
      Alert.alert('Coming soon', 'Google sign-in will be available shortly.');
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err?.message || 'Try again');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top branding area */}
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
              <Text className="text-white text-xl font-extrabold">O</Text>
            </View>
            <Text className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back
            </Text>
            <Text className="text-slate-400 text-base mt-2 font-medium">
              Sign in to your Uniflo account
            </Text>
          </View>

          {/* Form */}
          <View className="flex-1 px-8 pt-8">
            {/* Google Login */}
            <Pressable
              onPress={onGoogleLogin}
              disabled={googleLoading}
              className="flex-row items-center justify-center bg-white border border-slate-200 rounded-2xl py-3.5 mb-6 active:bg-slate-50"
              style={{
                shadowColor: '#0f172a',
                shadowOpacity: 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              {googleLoading ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <>
                  <View className="mr-3">
                    <GoogleIcon size={20} />
                  </View>
                  <Text className="text-[15px] font-bold text-slate-700">
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-slate-200" />
              <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mx-4">
                or with email
              </Text>
              <View className="flex-1 h-px bg-slate-200" />
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
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 mb-2">
              <Lock size={18} color="#94a3b8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
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

            {/* Forgot password */}
            <View className="items-end mb-6">
              <Pressable className="py-1 active:opacity-60">
                <Text className="text-[13px] font-bold text-emerald-600">
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* Sign in button */}
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
                  Sign in
                </Text>
              )}
            </Pressable>

            {/* Sign up link */}
            <Link href="/register" asChild>
              <Pressable className="mt-6 mb-8 items-center active:opacity-60">
                <Text className="text-sm text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <Text className="text-emerald-600 font-bold">Sign up</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
