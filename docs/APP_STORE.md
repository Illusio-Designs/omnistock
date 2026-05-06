# App-store release checklist

> Everything required to take `mobile/` from "running in Expo Go" to
> approved on the iOS App Store and Google Play. Code-side scaffolding
> (bundle id, splash, intent filters, permissions strings) is already in
> `mobile/app.json`. The remaining work is **assets + store listings +
> account setup**, which can't be done from the repo.

## 1. Identifiers — already configured

- iOS bundle id: `com.kartriq.app`
- Android package: `com.kartriq.app`
- Scheme: `kartriq://`
- Universal links: `kartriq.com/m/*`, `app.kartriq.com/*`

## 2. Image assets to produce (`mobile/assets/`)

| File | Purpose | Spec |
|---|---|---|
| `icon.png` | Master app icon (Expo will resize) | 1024×1024 PNG, no transparency, no rounded corners (the OS adds them) |
| `adaptive-icon.png` | Android foreground only | 1024×1024 PNG with 1/3 padding around the logo |
| `splash.png` | Splash screen — referenced from `app.json` | 1242×2436 PNG, logo centered on `#0b1220` |
| `notification-icon.png` | Android notification tray icon | 96×96 PNG, single colour silhouette (Android tints it) |
| `favicon.png` | Web favicon (Expo Web only) | 48×48 PNG |

Tools:
- [`expo-asset` + `expo-cli generate-assets`](https://docs.expo.dev/develop/user-interface/splash-screen/) — creates all the platform-specific sizes from the master files
- Free icon generators: appicon.co, easyappicon.com

## 3. Store listings — the copy you'll paste in

### Both stores
- **App name:** Kartriq
- **Subtitle / short description (30 chars):** *Multi-channel commerce, one app.*
- **Long description:** ~2 paragraphs. Lead with the pain (juggling Amazon + Shopify + Flipkart inventory), follow with the offer (sync, route, analyse, all in one place). End with social proof if you have it (X tenants, Y crores GMV).
- **Keywords (iOS):** ecommerce, inventory, orders, shopify, amazon, flipkart, omnichannel, india, b2b, wholesale, gst
- **Category:** Business · Productivity (secondary)
- **Privacy policy URL:** `https://kartriq.com/privacy`
- **Support URL:** `https://kartriq.com/help`
- **Marketing URL:** `https://kartriq.com`

### iOS App Store specifics
- **Age rating:** 4+
- **Encryption declaration:** None — already set via `ITSAppUsesNonExemptEncryption: false` in app.json
- **Sign in with Apple:** required if you offer ANY social sign-in (you offer Google → must add Apple eventually). Defer until first paying customer asks.

### Google Play specifics
- **Content rating:** Everyone
- **Target audience:** 18+
- **Data Safety form:** see section 5 below

## 4. Screenshots required

Both stores want 4–8 screenshots per device class. Generate these from a real running app, not Figma mockups.

### iOS
- 6.7" iPhone (1290×2796) — required
- 6.5" iPhone (1242×2688)
- 5.5" iPhone (1242×2208) — only if targeting iOS 13 era
- 12.9" iPad Pro (2048×2732) — only if `supportsTablet: true` (it is)

### Android
- Phone (1080×1920 or higher, 16:9 / 9:16)
- 7" tablet
- 10" tablet

Recommended frame order:
1. Dashboard with real-looking numbers
2. Orders list with channel icons
3. Order detail with RTO score
4. Inventory view
5. Channels page (visual proof of integrations)
6. Settings → Biometric unlock toggle (security signal)
7. Reports / charts
8. Refer & earn (drives conversion)

Tool: [appmockup.com](https://app-mockup.com/) or [previewed.app](https://previewed.app) — drop screenshots, get framed renders.

## 5. iOS Privacy nutrition labels + Android Data Safety

You'll fill these out in App Store Connect / Play Console. Source of truth — what we collect:

| Data | Used for | Linked to identity? | Tracking? |
|---|---|---|---|
| Email | Account, login, password reset | Yes | No |
| Name | Account display | Yes | No |
| Phone | Account, optional | Yes | No |
| Device push token | Order alerts, security alerts | Yes | No |
| IP address | Audit log, fraud prevention | Yes | No |
| User agent | Audit log | Yes | No |
| Crashes / logs | Diagnostics (Sentry) | No (anonymised) | No |

We do **not**:
- Track users across other apps/websites
- Share data with third parties for advertising
- Sell personal data

## 6. Universal link verification (one-time)

For HTTPS links to open the app instead of Safari/Chrome, both stores require an "I own this domain" handshake:

### iOS — `apple-app-site-association` file
Host at `https://kartriq.com/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.kartriq.app"],
        "components": [{ "/": "/m/*", "comment": "Mobile-routed paths" }]
      }
    ]
  }
}
```
Replace `TEAMID` with your Apple Developer Team ID.

### Android — `assetlinks.json`
Host at `https://kartriq.com/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.kartriq.app",
    "sha256_cert_fingerprints": ["YOUR:SHA256:FINGERPRINT:HERE"]
  }
}]
```
Get the fingerprint after the first EAS build via `eas credentials`.

Add both to your Next.js `frontend/public/.well-known/` folder so they're served from `https://kartriq.com/.well-known/...`.

## 7. Build + submit

```bash
# Once: install EAS CLI
npm install -g eas-cli
eas login

# Configure
cd mobile
eas build:configure

# Production builds
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit
eas submit --platform ios
eas submit --platform android
```

First-time approval timing: iOS ~2–5 days, Android ~few hours to 3 days.

## 8. Over-the-air updates after launch

EAS Update lets you ship JS-only changes without an App Store re-submission:
```bash
eas update --branch production --message "Hotfix invoice rendering"
```
Use sparingly — large refactors should still go through review.

---

## Summary — what blocks launch right now

- [ ] Master icon (1024×1024) and splash artwork from a designer
- [ ] App Store Connect + Google Play Developer accounts (~$124 / yr combined)
- [ ] EAS account + first production build
- [ ] Privacy / Terms pages (already on `kartriq.com`)
- [ ] `.well-known/apple-app-site-association` + `.well-known/assetlinks.json` published on the marketing site
- [ ] 4–8 framed screenshots per device class
- [ ] Store listing copy
