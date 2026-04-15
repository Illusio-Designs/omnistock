# OmniStock Mobile

Expo (React Native) companion app for OmniStock. Mirrors the authenticated areas
of the web frontend — public/marketing pages (landing, about, pricing, features,
solutions, help, contact, resources) are intentionally excluded.

## Stack

- **Expo SDK 51** + **expo-router** (file-based routing)
- **@tanstack/react-query** — same patterns as `frontend/`
- **axios** — API client ported from `frontend/lib/api.ts`
- **zustand** + **AsyncStorage** — auth store with persistence
- **expo-secure-store** — JWT token storage on device
- **nativewind** — Tailwind for React Native (same class names as web)
- **lucide-react-native** — icons (RN variant of `lucide-react`)

## Setup

```bash
cd mobile
npm install
```

Point the app at your backend by editing `extra.apiUrl` in `app.json`:

```json
"extra": { "apiUrl": "http://<your-lan-ip>:5000/api/v1" }
```

(Use your machine's LAN IP, not `localhost`, when testing on a physical device.)

## Run

```bash
npm run start        # Expo dev server
npm run android      # Android emulator / device
npm run ios          # iOS simulator (macOS only)
npm run web          # Web preview
```

## Routes

- `(auth)/login` — email + password sign-in
- `(auth)/onboarding` — first-time tenant setup
- `(app)/dashboard` — KPIs
- `(app)/orders` — orders list
- `(app)/products` — products list
- `(app)/reports` — sales report
- `(app)/more` — drawer to the rest:
  - `inventory`, `purchases`, `vendors`, `warehouses`, `customers`,
    `channels`, `shipments`, `invoices`, `settings`
  - `admin` — visible only to platform admins

## Status

This is the initial scaffold. Each screen is wired to its backend endpoint and
renders a basic list/KPI view. Detail screens, forms, and channel-specific
flows (OAuth, MCF, shipping) will be ported incrementally — the API client in
`lib/api.ts` already covers every endpoint used by the web frontend.
