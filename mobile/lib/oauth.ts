// OAuth bridge between the mobile app and the backend's /oauth/{provider}
// endpoints. The flow is:
//
//   1. Backend generates the provider authorization URL with our redirect_uri
//      pointing at /oauth/{provider}/callback (web).
//   2. Mobile opens that URL inside an ASWebAuthenticationSession (iOS) or
//      Custom Tab (Android) via expo-web-browser. The seller signs in on the
//      provider's site.
//   3. Provider redirects back to our backend callback. The backend exchanges
//      the code for tokens and stores them encrypted on the channel.
//   4. Mobile polls /oauth/{provider}/status?channelId=X for up to ~30s to
//      detect when the channel becomes "connected".
//
// We deliberately don't expect the provider to deep-link back into the mobile
// app — that would require registering a custom redirect_uri with every
// platform (Amazon, Shopify, etc.) and an app-side scheme handler. Polling
// the backend is a much simpler universal pattern.

import { oauthApi, channelApi } from './api';

type Provider =
  | 'amazon' | 'shopify' | 'flipkart' | 'meta'
  | 'lazada' | 'shopee' | 'mercadolibre' | 'allegro' | 'wish';

type StartArgs = {
  channelId: string;
  region?: string;
  shop?: string;       // shopify only
  sandbox?: boolean;   // allegro only
};

async function getStartUrl(provider: Provider, args: StartArgs): Promise<string> {
  switch (provider) {
    case 'amazon':       return (await oauthApi.amazonStart(args.channelId, args.region)).data?.url;
    case 'shopify':      return (await oauthApi.shopifyStart(args.channelId, args.shop || '')).data?.url;
    case 'flipkart':     return (await oauthApi.flipkartStart(args.channelId)).data?.url;
    case 'meta':         return (await oauthApi.metaStart(args.channelId)).data?.url;
    case 'lazada':       return (await oauthApi.lazadaStart(args.channelId, args.region || 'sg')).data?.url;
    case 'shopee':       return (await oauthApi.shopeeStart(args.channelId, args.region || 'sg')).data?.url;
    case 'mercadolibre': return (await oauthApi.mercadoLibreStart(args.channelId, args.region || 'global')).data?.url;
    case 'allegro':      return (await oauthApi.allegroStart(args.channelId, !!args.sandbox)).data?.url;
    case 'wish':         return (await oauthApi.wishStart(args.channelId)).data?.url;
  }
}

// Maps a channel.type → oauth provider key. Returns null when the channel
// uses static credentials (no OAuth flow) — caller falls back to the
// credentials form in that case.
export function providerFor(channelType: string): Provider | null {
  if (channelType === 'AMAZON' || channelType === 'AMAZON_SMARTBIZ' ||
      channelType.startsWith('AMAZON_')) return 'amazon';
  if (channelType === 'SHOPIFY' || channelType === 'SHOPIFY_POS') return 'shopify';
  if (channelType === 'FLIPKART' || channelType === 'FLIPKART_MINUTES' ||
      channelType === 'FLIPKART_SMART_FULFILLMENT') return 'flipkart';
  if (channelType === 'INSTAGRAM' || channelType === 'FACEBOOK' ||
      channelType === 'WHATSAPP_BUSINESS') return 'meta';
  if (channelType === 'LAZADA') return 'lazada';
  if (channelType === 'SHOPEE') return 'shopee';
  if (channelType === 'MERCADO_LIBRE') return 'mercadolibre';
  if (channelType === 'ALLEGRO') return 'allegro';
  if (channelType === 'WISH') return 'wish';
  return null;
}

// Polls the backend until the channel reports a non-empty credentials object
// or the timeout elapses. Returns true if connected, false on timeout.
async function pollUntilConnected(channelId: string, ms: number = 60_000): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const { data } = await channelApi.get(channelId);
      // Backend masks credentials but exposes a `connected` flag.
      if (data?.connected || data?.lastSyncAt) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

/**
 * Kick off an OAuth flow for the given channel. Opens the provider auth URL
 * in an in-app browser (via expo-web-browser) and resolves with whether the
 * channel ended up with valid credentials.
 *
 * Requires `expo-web-browser` to be installed in the mobile app.
 */
export async function startOAuth(provider: Provider, args: StartArgs): Promise<{ ok: boolean; reason?: string }> {
  // Lazy-require so the app boots even if expo-web-browser isn't installed yet.
  let WebBrowser: any;
  try {
    WebBrowser = require('expo-web-browser');
  } catch {
    return { ok: false, reason: 'expo-web-browser is not installed. Run `npx expo install expo-web-browser`.' };
  }

  let url: string;
  try {
    url = await getStartUrl(provider, args);
  } catch (err: any) {
    return { ok: false, reason: err?.response?.data?.error || err?.message || 'Failed to fetch auth URL' };
  }
  if (!url) return { ok: false, reason: 'Backend returned empty auth URL' };

  const result = await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: '#06D4B8',
    toolbarColor: '#ffffff',
  });

  if (result?.type === 'cancel' || result?.type === 'dismiss') {
    // User closed the sheet — could still have completed the flow on the
    // provider side. Poll the backend to find out.
  }

  const connected = await pollUntilConnected(args.channelId, 30_000);
  return connected
    ? { ok: true }
    : { ok: false, reason: 'OAuth did not complete in time. Reopen and try again.' };
}
