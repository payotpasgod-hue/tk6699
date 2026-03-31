# TK6699 Casino Platform

## Overview

Production casino platform (TK6699 branding) with phone-based auth, admin dashboard, and OroPlay game integration via relay VPS proxy. Currency: BDT (৳). Built as a pnpm workspace monorepo using TypeScript. Mobile-first PWA with install prompt.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind + shadcn/ui
- **State**: Zustand (persisted)
- **Auth**: Phone + password, bcryptjs hashing, bearer token sessions, rate-limited registration, Google OAuth (popup flow)
- **PWA**: manifest.json, service worker (network-first + cache fallback), install prompt (Android/iOS)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (API server), Vite (frontend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   └── src/routes/
│   │       ├── auth.ts     # Register/login/logout/me + session middleware
│   │       ├── admin.ts    # User mgmt, deposit/withdraw, stats
│   │       └── oroplay.ts  # OroPlay proxy + seamless wallet callbacks
│   └── casino-lobby/       # React casino lobby UI
│       └── src/
│           ├── pages/      # Lobby, Login, Register, Admin, Bonus, Deposit, Withdraw
│           ├── components/ # Navbar, CategoryTabs, PromoBanner, GameRow, GameGrid, ProviderChips, BottomNav, RewardsBonusSection, etc.
│           ├── store/      # use-auth-store, use-lobby-store
│           └── lib/        # api.ts (auth-aware fetch)
├── lib/
│   ├── db/                 # Drizzle ORM schema (users, sessions, transactions)
│   ├── api-spec/           # OpenAPI spec + Orval codegen
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-zod/            # Generated Zod schemas
├── scripts/                # Utility scripts
└── exports/                # relay_main.py for VPS deployment
```

## Database Schema

### users
- id, phone (unique), passwordHash, displayName, balance (numeric), currency (BDT), role (player/admin), userCode (unique), isActive, withdrawPassword (bcrypt-hashed 4-6 digit PIN), createdAt, updatedAt

### sessions
- id, userId, token (unique), expiresAt, createdAt

### transactions
- id, userId, type (bet/win/cancel/admin_deposit/admin_withdraw), amount, balanceAfter, transactionCode (unique), vendorCode, gameCode, roundId, description, createdAt

### deposits
- id, userId, amount, method (bkash/nagad), transactionId, screenshotUrl, status (pending/approved/rejected), adminNote, createdAt, updatedAt

### withdrawals
- id, userId, amount, method (bkash/nagad), accountNumber, status (pending/approved/rejected), adminNote, createdAt, updatedAt

### site_settings
- id, key (unique), value, createdAt, updatedAt

## API Routes

### Auth (`/api/auth/*`)
- `POST /register` — phone + password + displayName → token + user
- `POST /login` — phone + password → token + user
- `POST /logout` — invalidate session (requires auth)
- `GET /me` — current user info (requires auth)

### Admin (`/api/admin/*`) — requires auth + admin role
- `GET /users` — list all users with balances
- `POST /deposit` — atomic deposit to user {userId, amount}
- `POST /withdraw` — atomic withdraw from user {userId, amount}
- `POST /toggle-user` — enable/disable user {userId, isActive}
- `GET /transactions` — transaction history with pagination
- `GET /stats` — total users, active users, total balance
- `GET /deposits` — list all deposit requests with user info
- `POST /deposit/:id/approve` — approve pending deposit (credits balance + bonus)
- `POST /deposit/:id/reject` — reject pending deposit
- `GET /withdrawals` — list all withdrawal requests with user info
- `POST /withdrawal/:id/approve` — approve pending withdrawal
- `POST /withdrawal/:id/reject` — reject pending withdrawal (refunds balance)
- `GET /settings` — all site settings
- `POST /settings` — upsert site settings {settings: Record<string, string>}
- `GET /request-log` — in-memory API request log
- `GET /error-log` — in-memory error log
- `GET /bonus-claims` — all bonus claims across users with amounts
- `GET /system-health` — relay VPS status/latency, DB status/latency, game cache info, error counts, uptime, memory, live visitor stats (online now, today visits, unique IPs, total visits)

### Deposit (`/api/deposit/*`) — requires auth
- `POST /create` — submit deposit request {amount, method, transactionId, screenshot}
- `GET /history` — current user's deposit history
- `GET /bonuses` — available deposit bonus tiers

### Withdraw (`/api/withdraw/*`) — requires auth
- `POST /create` — submit withdrawal {amount, method, accountNumber, withdrawPassword}
- `GET /history` — current user's withdrawal history
- `GET /has-password` — check if user has withdraw PIN set
- `POST /set-password` — set/update 4-6 digit withdraw PIN

### Settings (`/api/settings/*`)
- `GET /public` — public settings (payment numbers, limits, red pocket config)

### OroPlay (`/api/oroplay/*`)
- `POST /game/launch` — get game launch URL (requires auth)
- `GET /player/balance` — get player balance (requires auth)
- `POST /cache/refresh` — refresh game cache (requires admin)
- `GET /agent/balance` — OroPlay agent balance (requires admin)
- `GET /cache` — cached game data (public)
- `GET /vendors`, `POST /games`, `POST /game/detail` — game catalog

### Bonus (`/api/bonus/*`) — requires auth
- `POST /claim` — claim a bonus {bonusType, bonusKey} → amount + newBalance
- `GET /claims` — list all claims for current user

### Seamless Wallet Callbacks (`/api/*`) — Basic auth (clientId:clientSecret)
- `POST /balance` — OroPlay queries player balance
- `POST /transaction` — single transaction (bet/win/cancel)
- `POST /batch-transactions` — batch transactions

## Security

- Wallet callbacks use PostgreSQL transactions with advisory locks (`pg_advisory_xact_lock`) for race-safe atomic idempotency
- Balance mutation + transaction insert happen in a single DB transaction — no double-apply on concurrent duplicate requests
- Transaction dedup via unique transactionCode + in-memory cache + DB unique constraint
- Callback auth fails closed (rejects if credentials not configured)
- OroPlay proxy endpoints (`/vendors`, `/games`, `/game/detail`) require user authentication
- OroPlay token endpoint requires admin authentication
- Admin endpoints require role="admin"
- Session tokens: 30-day expiry, Bearer token in Authorization header
- Registration rate-limited: 5 registrations per IP per hour

## Bonus System

- **Registration bonus**: ৳19 credited immediately on new account creation (no deposit required)
- **Welcome bonus package**: ৳575 total (displayed on login/register pages via popup modal)
  - ৳19 registration (free), ৳156 first deposit (100%), ৳100 second deposit (50%), ৳100 third deposit (25%), ৳100 daily cashback (10%), ৳100 VIP weekly
- **Bonus Center page**: spin wheel, daily rewards, hourly bonus — all call `/api/bonus/claim` for real balance mutations with advisory-locked atomic updates
  - Lucky Spin: random ৳10-500, 1x per hour (server-enforced)
  - Daily rewards: 7-day streak (৳10/20/30/50/75/100/500), each day claimable once
  - Hourly bonus: random ৳5-100, 1x per hour (server-enforced via DB timestamp)
  - Claims tracked in `bonus_claims` table with duplicate prevention
  - VIP tiers and referral: UI-only (decorative)
- **Welcome popup**: Appears on first visit to login page (session-scoped, dismissed after viewing)

## PWA Support

- `public/manifest.json` — App manifest with TK6699 branding, standalone display, portrait orientation
- `public/sw.js` — Service worker with network-first strategy + cache fallback
- `PWAInstallPrompt` component — Shows install banner (Android native prompt, iOS share instructions)
- `index.html` — apple-mobile-web-app-capable, theme-color, viewport-fit=cover meta tags
- All PWA paths use relative URLs to support non-root base path deployment

## Network Architecture

```
Player → Replit App (this server)
Replit App → OroPlay API (https://bs.sxvwlkohlv.com/api/v2)
OroPlay → Relay VPS → Replit App (seamless wallet callbacks)
```

- **Client ID**: tk6699
- **API endpoint**: https://bs.sxvwlkohlv.com/api/v2
- **Wallet mode**: Seamless (all balances in our DB)
- **Currency**: BDT (৳)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `OROPLAY_CLIENT_ID` — OroPlay client ID (tk6699)
- `OROPLAY_CLIENT_SECRET` — OroPlay client secret
- `OROPLAY_API_ENDPOINT` — OroPlay API endpoint (https://bs.sxvwlkohlv.com/api/v2)
- `SESSION_SECRET` — Session signing secret
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID for Google Sign-In

## UI Assets

- **Company logo**: `public/images/logo.png` — AI-generated TK6699 logo with golden crown
- **Promo banners**: `public/images/promo-*.png` — Welcome, VIP, Slots, Cashback banners for carousel (image-only, no text overlay)
- **Provider logos**: Real logos from cdn.softswiss.net CDN with text-initial fallback
- **Login/Register**: Google Sign-In via OAuth popup flow (custom styled button, works in iframes)
- **Google auth helper**: `src/lib/google-auth.ts` — popup OAuth + redirect fallback
- **Bonus page** (`/bonus`): Lucky Spin wheel, Daily Login Rewards, Hourly Bonus, Deposit Bonus promos, VIP Tiers, Referral System
- **Visitor tracking**: In-memory tracking middleware (online sessions, daily visits, unique IPs, total visits) — stats displayed in admin overview

## Color Theme

- **Background**: Dark navy #070b14, #0a0e1a, #0d1220, #111827
- **Primary accent**: Amber/gold #f59e0b (amber-500), #fbbf24 (amber-400)
- **Secondary**: Orange #f97316 (orange-500)

## Dev Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/casino-lobby run dev` — start frontend
- `pnpm --filter @workspace/db run push` — push schema to DB
- `pnpm run typecheck` — full project typecheck
