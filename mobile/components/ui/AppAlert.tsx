/**
 * Branded modal alert — drop-in replacement for React Native's
 * Alert.alert() popup. Mounted once at the root layout; reads its
 * state from useAlertStore and renders a centered card with the
 * project's design language.
 *
 * Visuals
 *   • Coloured icon header tinted to the alert kind
 *     (info / success / warning / error / confirm)
 *   • Rounded card with shadow, centered modally
 *   • Buttons row at the bottom — primary right-aligned, cancel
 *     ghost-styled on the left. Destructive buttons get a rose
 *     foreground colour.
 *   • Backdrop tap = press the "cancel"-styled button if present,
 *     otherwise close without firing anything.
 *
 * Accessibility
 *   • role="alertdialog" via accessibilityViewIsModal on the panel
 *   • Hardware back button on Android closes via the cancel button
 *     (same as backdrop tap behaviour)
 */

import { useEffect } from 'react';
import { BackHandler, Modal, Pressable, Text, View } from 'react-native';
import {
  AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info,
} from 'lucide-react-native';
import { useAlertStore, type AlertKind } from '../../store/alert.store';

const KIND_META: Record<AlertKind, { Icon: any; tint: string; bg: string }> = {
  info:    { Icon: Info,         tint: '#0284c7', bg: 'bg-sky-50' },
  success: { Icon: CheckCircle2, tint: '#04AB94', bg: 'bg-emerald-50' },
  warning: { Icon: AlertTriangle,tint: '#d97706', bg: 'bg-amber-50' },
  error:   { Icon: AlertCircle,  tint: '#e11d48', bg: 'bg-rose-50' },
  confirm: { Icon: HelpCircle,   tint: '#475569', bg: 'bg-slate-100' },
};

export default function AppAlert() {
  const current = useAlertStore((s) => s.current);
  const dismiss = useAlertStore((s) => s.dismiss);

  // Android back button — close via the cancel button if one exists.
  useEffect(() => {
    if (!current) return;
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cancel?.onPress) cancel.onPress();
      dismiss(current.id);
      return true;
    });
    return () => sub.remove();
  }, [current, dismiss]);

  if (!current) return null;
  const meta = KIND_META[current.kind] || KIND_META.info;
  const { Icon } = meta;

  const handlePress = (btn: { onPress?: () => void }) => {
    btn.onPress?.();
    dismiss(current.id);
  };

  const onBackdropTap = () => {
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    if (cancel?.onPress) cancel.onPress();
    dismiss(current.id);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onBackdropTap}
      statusBarTranslucent
    >
      <Pressable
        onPress={onBackdropTap}
        className="flex-1 bg-slate-900/55 items-center justify-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 16,
          }}
        >
          {/* Icon header */}
          <View className="items-center pt-7 pb-3 px-6">
            <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${meta.bg}`}>
              <Icon size={28} color={meta.tint} strokeWidth={2.2} />
            </View>
            <Text className="text-lg font-extrabold text-slate-900 text-center tracking-tight">
              {current.title}
            </Text>
            {current.message ? (
              <Text className="text-sm text-slate-500 text-center mt-1.5 leading-5">
                {current.message}
              </Text>
            ) : null}
          </View>

          {/* Buttons */}
          <View className="border-t border-slate-100 flex-row">
            {current.buttons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isLast = i === current.buttons.length - 1;
              return (
                <Pressable
                  key={`${btn.text}-${i}`}
                  onPress={() => handlePress(btn)}
                  className={`flex-1 py-4 items-center justify-center ${
                    !isLast ? 'border-r border-slate-100' : ''
                  } active:bg-slate-50`}
                >
                  <Text
                    className={`text-base font-bold ${
                      isDestructive
                        ? 'text-rose-600'
                        : isCancel
                          ? 'text-slate-500'
                          : 'text-emerald-600'
                    }`}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
