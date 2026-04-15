import { View, ViewProps } from 'react-native';

type Props = ViewProps & { className?: string };

export default function Card({ className = '', children, ...rest }: Props) {
  return (
    <View
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
