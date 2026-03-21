# BudgetBoss — Developer Setup Guide

Quick-start guide for running and developing the BudgetBoss web app and mobile app locally.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| PostgreSQL | any recent | Must be running locally |
| npm | bundled with Node | Used for all package management |
| EAS CLI | ≥ 12.0.0 | Mobile builds only: `npm install -g eas-cli` |
| Expo CLI | bundled via `expo` package | Mobile dev only |

---

## Web App (Next.js 15)

**Directory:** `app/`

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/budgetboss"
AUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. (Optional) Seed demo data

```bash
npm run db:seed
```

This creates a demo user: `alex@example.com` / `password123`.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:generate` | Regenerate Prisma client |

---

## Mobile App (Expo / React Native)

**Directory:** `mobile/`

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Start the dev server

```bash
npm run start          # Interactive Expo menu
npm run ios            # iOS simulator
npm run android        # Android emulator
```

> Make sure you have Xcode (iOS) or Android Studio (Android) installed and configured.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start Expo dev server |
| `npm run ios` | Start on iOS simulator |
| `npm run android` | Start on Android emulator |
| `npm run web` | Start in web browser |
| `npm run lint` | Run Expo lint |

### iOS Builds (EAS)

Production and preview builds use [EAS Build](https://docs.expo.dev/build/introduction/).

**One-time EAS setup:**

```bash
npm install -g eas-cli
eas login
eas credentials   # Generate/manage signing certificates
```

Update `eas.json` → `submit.production.ios` with your Apple credentials:
- `appleId` — your Apple ID email
- `ascAppId` — numeric App ID from App Store Connect
- `appleTeamId` — 10-character team ID from [developer.apple.com](https://developer.apple.com) → Membership

**Build & release commands (from `mobile/`):**

| Command | Description |
|---------|-------------|
| `make dev` | Dev client build for simulator |
| `make preview` | Internal TestFlight-ready build |
| `make release` | Production build (auto-increments build number) |
| `make submit` | Submit latest production build to App Store |
| `make release-and-submit` | Build + submit in one step |
| `make credentials` | Manage iOS signing credentials |

---

## Static Landing Page

**Directory:** project root (`index.html`, `app.js`, `style.css`)

No build step — open `index.html` directly in a browser, or serve with any static server:

```bash
npx serve .
```

---

## Project Structure

```
BudgetBoss/
├── index.html          # Static landing page
├── app.js              # Landing page JS
├── style.css           # Landing page styles
├── ONBOARDING.md       # End-user guide
├── DEVELOPER.md        # This file
├── app/                # Next.js web app
│   ├── app/            # App Router pages + API routes
│   ├── components/     # React components
│   ├── lib/            # Auth + Prisma client
│   ├── prisma/         # Schema + migrations + seed
│   └── __tests__/      # Unit tests
└── mobile/             # Expo React Native app
    ├── app/            # Expo Router screens
    ├── components/     # React Native components
    ├── docs/           # Mobile-specific docs
    ├── eas.json        # EAS build profiles
    └── Makefile        # iOS build shortcuts
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` connection error | Ensure PostgreSQL is running and credentials match |
| `AUTH_SECRET` missing | Generate with `openssl rand -base64 32` |
| Prisma client out of date | Run `npm run db:generate` |
| EAS certificate errors | Run `eas credentials` to revoke and regenerate |
| Expo build fails on native module | Run `expo install` to align SDK versions |
