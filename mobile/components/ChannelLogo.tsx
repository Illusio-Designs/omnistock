import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import {
  domainFor,
  getChannelInitials,
  googleFaviconUrl,
  iconHorseUrl,
  logoDevUrl,
} from '../lib/channel-logos';

type Props = {
  type: string;
  name?: string;
  size?: number;
  className?: string;
};

/**
 * Channel brand mark with a 3-step logo fallback chain identical to the web
 * <ChannelLogo>:
 *   1. logo.dev   (clean brand-grade marks)
 *   2. icon.horse (apple-touch-icon scraper)
 *   3. google s2  (favicon)
 *   4. gradient initials placeholder
 *
 * Each step is tried in turn via Image.onError. All sources resolve by domain
 * so we never need per-channel PNG files.
 */
export default function ChannelLogo({ type, name, size = 48, className = '' }: Props) {
  const domain = domainFor(type, name);
  const sources = [logoDevUrl(domain), iconHorseUrl(domain), googleFaviconUrl(domain)];
  const [step, setStep] = useState(0);
  const failed = step >= sources.length;

  if (failed) {
    return (
      <View
        className={`bg-slate-900 items-center justify-center ${className}`}
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
      >
        <Text className="text-white font-extrabold" style={{ fontSize: size * 0.32 }}>
          {getChannelInitials(name || type)}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`bg-white border border-slate-200 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <Image
        source={{ uri: sources[step] }}
        onError={() => setStep((s) => s + 1)}
        style={{ width: size * 0.7, height: size * 0.7 }}
        resizeMode="contain"
      />
    </View>
  );
}
