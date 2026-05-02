import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { ToastType, useToastStore } from '../../store/toast.store';

const STYLES: Record<ToastType, { bg: string; border: string; text: string; iconColor: string; Icon: any }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconColor: '#04AB94', Icon: CheckCircle2 },
  error:   { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    iconColor: '#e11d48', Icon: XCircle },
  info:    { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-800',     iconColor: '#0284c7', Icon: Info },
  warning: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   iconColor: '#d97706', Icon: AlertTriangle },
};

/**
 * Mount once at the root layout. Renders all queued toasts pinned at the
 * bottom of the screen above any nav. Use `toast.success(...)` /
 * `toast.error(...)` from anywhere to push.
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-4"
      style={{ bottom: 24, zIndex: 9999 }}
    >
      {toasts.map((t) => {
        const s = STYLES[t.type];
        const { Icon } = s;
        return (
          <View
            key={t.id}
            className={`flex-row items-start gap-3 p-4 rounded-2xl border mb-2 ${s.bg} ${s.border}`}
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <View className="mt-0.5">
              <Icon size={18} color={s.iconColor} />
            </View>
            <View className="flex-1 min-w-0">
              {t.title ? (
                <Text className={`text-[13px] font-bold mb-0.5 ${s.text}`}>{t.title}</Text>
              ) : null}
              <Text className={`text-[13px] leading-5 ${s.text}`}>{t.message}</Text>
            </View>
            <Pressable
              onPress={() => dismiss(t.id)}
              className="opacity-50 active:opacity-100 p-1"
              hitSlop={8}
            >
              <X size={14} color={s.iconColor} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
