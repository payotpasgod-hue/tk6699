# TK6699 Casino Platform

## Overview

Production casino platform (TK6699 branding) with phone-based auth, admin dashboard, and OroPlay game integration via relay VPS proxy. Currency: BDT (৳). Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind + shadcn/ui
- **State**: Zustand (persisted)
- **Auth**: Phone + password, bcryptjs hashing, bearer token sessions
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
│           ├── pages/      # Lobby, Login, Register, Admin, Bonus
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
- id, phone (unique), passwordHash, displayName, balance (numeric), currency (BDT), role (player/admin), userCode (unique), isActive, createdAt, updatedAt

### sessions
- id, userId, token (unique), expiresAt, createdAt

### transactions
- id, userId, type (bet/win/cancel/admin_deposit/admin_withdraw), amount, balanceAfter, transactionCode (unique), vendorCode, gameCode, roundId, description, createdAt

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

### OroPlay (`/api/oroplay/*`)
- `POST /game/launch` — get game launch URL (requires auth)
- `GET /player/balance` — get player balance (requires auth)
- `POST /cache/refresh` — refresh game cache (requires admin)
- `GET /agent/balance` — OroPlay agent balance (requires admin)
- `GET /cache` — cached game data (public)
- `GET /vendors`, `POST /games`, `POST /game/detail` — game catalog

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

## Network Architecture

```
Player → Replit App (this server)
Replit App → Relay VPS (193.23.221.170:9000) → OroPlay API
OroPlay → Relay VPS → Replit App (seamless wallet callbacks)
```

- **Client ID**: tk6699
- **Relay endpoint**: http://193.23.221.170:9000/api/v2
- **Wallet mode**: Seamless (all balances in our DB)
- **Currency**: BDT (৳)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `OROPLAY_CLIENT_ID` — OroPlay client ID (tk6699)
- `OROPLAY_CLIENT_SECRET` — OroPlay client secret
- `OROPLAY_API_ENDPOINT` — Relay VPS endpoint
- `SESSION_SECRET` — Session signing secret

## UI Assets

- **Company logo**: `public/images/logo.png` — AI-generated TK6699 logo with golden crown
- **Promo banners**: `public/images/promo-*.png` — Welcome, VIP, Slots, Cashback banners for carousel (image-only, no text overlay)
- **Provider logos**: Real logos from cdn.softswiss.net CDN with text-initial fallback
- **Login/Register**: Google sign-in button (placeholder — needs Google OAuth credentials to activate)
- **Bonus page** (`/bonus`): Gift Box (9 mystery boxes), Lucky Spin wheel, Daily Login Rewards, Hourly Bonus, Missions, VIP Tiers, Referral System

## Color Theme

- **Background**: Dark navy #070b14, #0a0e1a, #0d1220, #111827
- **Primary accent**: Amber/gold #f59e0b (amber-500), #fbbf24 (amber-400)
- **Secondary**: Orange #f97316 (orange-500)

## Dev Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/casino-lobby run dev` — start frontend
- `pnpm --filter @workspace/db run push` — push schema to DB
- `pnpm run typecheck` — full project typecheck
