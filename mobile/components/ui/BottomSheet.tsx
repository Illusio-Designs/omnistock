import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function BottomSheet({ visible, onClose, title, children }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <Animated.View
          style={{ transform: [{ translateY }], maxHeight: SCREEN_H * 0.9 }}
          className="bg-white rounded-t-3xl"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Handle bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-slate-300" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-3">
              <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
