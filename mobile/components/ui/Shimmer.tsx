import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  className?: string;
};

function ShimmerBox({
  width = '100%',
  height = 16,
  borderRadius = 12,
  style,
  className = '',
}: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      className={`bg-slate-200 ${className}`}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Pre-built skeleton layouts ──────────────────────────────────────

/** Skeleton for a list row (icon + text lines) */
function ListRowSkeleton() {
  return (
    <View className="flex-row items-center px-5 py-4">
      <ShimmerBox width={44} height={44} borderRadius={16} />
      <View className="flex-1 ml-3.5">
        <ShimmerBox width="70%" height={14} borderRadius={8} />
        <ShimmerBox width="45%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
      <ShimmerBox width={60} height={24} borderRadius={12} />
    </View>
  );
}

/** Skeleton for a card list (multiple rows inside a card) */
function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className={i > 0 ? 'border-t border-slate-100/80' : ''}>
          <ListRowSkeleton />
        </View>
      ))}
    </View>
  );
}

/** Skeleton for a metric card (icon + number + label) */
function MetricCardSkeleton() {
  return (
    <View
      className="bg-white rounded-3xl border border-slate-100 p-5"
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <ShimmerBox width={40} height={40} borderRadius={16} />
      <ShimmerBox width="60%" height={22} borderRadius={8} style={{ marginTop: 12 }} />
      <ShimmerBox width="40%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Dashboard header skeleton */
function DashboardHeaderSkeleton() {
  return (
    <View className="bg-slate-800/60 rounded-3xl p-5 border border-slate-700/50">
      <View className="flex-row items-center mb-3">
        <ShimmerBox width={32} height={32} borderRadius={12} className="bg-slate-700" />
        <ShimmerBox width={100} height={14} borderRadius={8} className="bg-slate-700" style={{ marginLeft: 10 }} />
      </View>
      <ShimmerBox width="55%" height={32} borderRadius={10} className="bg-slate-700" />
      <ShimmerBox width="35%" height={12} borderRadius={6} className="bg-slate-700" style={{ marginTop: 8 }} />
      <View className="flex-row gap-3 mt-5">
        <ShimmerBox width="48%" height={40} borderRadius={16} className="bg-slate-700" />
        <ShimmerBox width="48%" height={40} borderRadius={16} className="bg-slate-700" />
      </View>
    </View>
  );
}

/** Dashboard full skeleton */
function DashboardSkeleton() {
  return (
    <View className="px-5 pt-6">
      {/* Stat cards */}
      <View className="flex-row gap-4 mb-5">
        <View className="flex-1"><MetricCardSkeleton /></View>
        <View className="flex-1"><MetricCardSkeleton /></View>
      </View>
      {/* Chart card */}
      <View
        className="bg-white rounded-3xl border border-slate-100 p-5 mb-5"
        style={{ shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
      >
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <ShimmerBox width={100} height={18} borderRadius={8} />
            <ShimmerBox width={80} height={12} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
          <ShimmerBox width={70} height={24} borderRadius={12} />
        </View>
        <ShimmerBox width="100%" height={140} borderRadius={12} />
      </View>
      {/* Transactions */}
      <ListSkeleton rows={4} />
    </View>
  );
}

/** Settings skeleton */
function SettingsSkeleton() {
  return (
    <View>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="bg-white rounded-3xl border border-slate-100 p-5 mb-4"
          style={{ shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
        >
          <View className="flex-row items-center mb-4">
            <ShimmerBox width={40} height={40} borderRadius={16} />
            <ShimmerBox width={100} height={18} borderRadius={8} style={{ marginLeft: 12 }} />
          </View>
          {[1, 2, 3].map((j) => (
            <View key={j} className={`flex-row justify-between py-3.5 ${j > 1 ? 'border-t border-slate-100' : ''}`}>
              <ShimmerBox width={80} height={14} borderRadius={8} />
              <ShimmerBox width={100} height={14} borderRadius={8} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default ShimmerBox;
export {
  ShimmerBox,
  ListRowSkeleton,
  ListSkeleton,
  MetricCardSkeleton,
  DashboardHeaderSkeleton,
  DashboardSkeleton,
  SettingsSkeleton,
};
