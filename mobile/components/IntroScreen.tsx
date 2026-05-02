import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Zap,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type Slide = {
  icon: React.ReactNode;
  iconBg: string;
  shadowColor: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: <Package size={32} color="#fff" />,
    iconBg: 'bg-emerald-500',
    shadowColor: '#06D4B8',
    title: 'Unified Inventory',
    description:
      'Track stock across all warehouses and channels in real-time. Never oversell again.',
  },
  {
    icon: <ShoppingCart size={32} color="#fff" />,
    iconBg: 'bg-sky-500',
    shadowColor: '#0ea5e9',
    title: 'Multi-channel Orders',
    description:
      'Sync orders from Amazon, Flipkart, Shopify and more into one powerful dashboard.',
  },
  {
    icon: <BarChart3 size={32} color="#fff" />,
    iconBg: 'bg-violet-500',
    shadowColor: '#8b5cf6',
    title: 'Smart Analytics',
    description:
      'AI-powered insights on sales trends, inventory forecasts, and growth opportunities.',
  },
  {
    icon: <Zap size={32} color="#fff" />,
    iconBg: 'bg-amber-500',
    shadowColor: '#f59e0b',
    title: 'Ready to Scale',
    description:
      'From 10 to 10,000 orders a day. Kartriq grows with your business.',
  },
];

type Props = {
  onFinish: () => void;
};

export default function IntroScreen({ onFinish }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
      onFinish();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Skip button */}
      {!isLast && (
        <View className="items-end px-6 pt-2">
          <Pressable onPress={onFinish} className="px-4 py-2 active:opacity-60">
            <Text className="text-slate-500 text-sm font-bold">Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide, idx) => (
          <View
            key={idx}
            style={{ width }}
            className="flex-1 items-center justify-center px-10"
          >
            {/* Icon */}
            <View
              className={`w-24 h-24 rounded-[28px] ${slide.iconBg} items-center justify-center mb-10`}
              style={{
                shadowColor: slide.shadowColor,
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              {slide.icon}
            </View>

            {/* Title */}
            <Text className="text-white text-[28px] font-extrabold tracking-tight text-center leading-tight mb-4">
              {slide.title}
            </Text>

            {/* Description */}
            <Text className="text-slate-400 text-base font-medium text-center leading-6 px-4">
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom area */}
      <View className="px-8 pb-8">
        {/* Dots */}
        <View className="flex-row items-center justify-center mb-8">
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              className={`mx-1.5 rounded-full ${
                idx === activeIndex
                  ? 'w-8 h-2 bg-emerald-500'
                  : 'w-2 h-2 bg-slate-700'
              }`}
            />
          ))}
        </View>

        {/* Action button */}
        <Pressable
          onPress={goNext}
          className="bg-emerald-600 rounded-2xl py-4 items-center active:bg-emerald-700"
          style={{
            shadowColor: '#06D4B8',
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Text className="text-white text-base font-bold tracking-wide">
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
