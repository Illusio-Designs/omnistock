import { View, ViewProps } from 'react-native';

type Props = ViewProps & { className?: string };

export default function Card({ className = '', children, ...rest }: Props) {
  return (
    <View
      className={`bg-white rounded-3xl border border-slate-100 ${className}`}
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
