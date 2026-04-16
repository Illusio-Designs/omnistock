import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message);
    console.error('[ErrorBoundary] Stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-8">
          <View className="w-16 h-16 rounded-2xl bg-rose-50 items-center justify-center mb-5">
            <AlertTriangle size={28} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-slate-900 text-center">
            Something went wrong
          </Text>
          <Text className="mt-2 text-sm text-slate-600 text-center">
            An unexpected error occurred. Please try again.
          </Text>
          <Text className="mt-3 text-[10px] text-slate-400 text-center font-mono px-4">
            {this.state.error?.message}
          </Text>
          <Pressable
            onPress={this.handleReset}
            className="mt-6 flex-row items-center bg-emerald-500 rounded-full px-6 py-3 active:opacity-80"
          >
            <RotateCcw size={14} color="white" />
            <Text className="text-white font-bold text-sm ml-2">Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
