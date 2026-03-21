# BudgetBoss

**Budgeting made benign.** BudgetBoss is a self-hosted, gamified personal finance app that makes tracking your money actually rewarding. Import bank transactions, set budgets by category, monitor savings goals, and earn XP and badges for healthy financial habits — all stored privately in your own database.

---

## What It Does

- **CSV Import** — Paste in exports from Rocket Money, Chase, Bank of America, or any bank. BudgetBoss auto-detects column layouts (Amount, Debit/Credit, Date, Description, Category).
- **Transaction Tracking** — Search, filter, edit, and categorize every transaction. Sort by date, category, amount, or account.
- **Budgets** — Set weekly, monthly, quarterly, or yearly spending limits per category. See real-time progress bars showing budget vs. actual spend.
- **Savings Goals** — Name a target (e.g. "Emergency Fund — $5,000"), set a deadline, and watch a progress bar fill as you save.
- **Gamification** — Earn XP for importing transactions, staying under budget, and hitting savings milestones. Level up, build streaks, and unlock badges with rarities ranging from Common to Legendary.
- **Multi-platform** — Full-featured Next.js web app plus an Expo React Native mobile companion for iOS and Android.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 (email/password + JWT) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest + React Testing Library |
| Mobile | Expo 52 / React Native |
| Mobile auth | Custom JWT bearer tokens (secure storage) |

---

## Project Structure

```
BudgetBoss/
├── index.html          # Static landing page
├── app.js              # Landing page JS
├── style.css           # Landing page styles
├── app/                # Next.js 15 web app
│   ├── app/            # App Router pages + API routes
│   │   ├── (auth)/     # Login / register pages
│   │   ├── (dashboard)/# Dashboard, transactions, budgets, goals
│   │   └── api/        # REST API routes
│   ├── components/     # Shared React components
│   ├── lib/            # Auth helpers + Prisma client
│   ├── prisma/         # Schema, migrations, seed data
│   └── __tests__/      # Unit tests
└── mobile/             # Expo React Native app
    ├── app/            # Expo Router screens
    ├── components/     # React Native components
    └── eas.json        # EAS build profiles
```

---

## Quick Start (Web App)

### Prerequisites

- Node.js 22+
- PostgreSQL (running locally or remote)

### 1. Clone and install

```bash
git clone https://github.com/MrMcClean1/BudgetBoss.git
cd BudgetBoss/app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/budgetboss"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
npm run db:migrate
npm run db:seed    # Optional: load demo user + sample data
```

Demo credentials (after seeding): `alex@example.com` / `password123`

### 4. Run

```bash
npm run dev        # Dev server → http://localhost:3000
npm run build && npm start   # Production
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:generate` | Regenerate Prisma client |

---

## Mobile App (iOS / Android)

```bash
cd mobile
npm install
npm run start       # Expo interactive menu
npm run ios         # iOS simulator (requires Xcode)
npm run android     # Android emulator (requires Android Studio)
```

Production builds use [EAS Build](https://docs.expo.dev/build/introduction/). See `DEVELOPER.md` for full EAS setup instructions.

---

## API Overview

All routes require authentication (NextAuth session cookie for web, JWT bearer token for mobile).

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| GET/POST | `/api/transactions` | List (paginated, filterable) or create transactions |
| PATCH/DELETE | `/api/transactions/[id]` | Update or delete a transaction |
| POST | `/api/transactions/import` | Import CSV file |
| GET/POST | `/api/budgets` | List budgets with current spend, or create |
| PATCH/DELETE | `/api/budgets/[id]` | Update or delete a budget |
| GET/POST | `/api/savings-goals` | List or create savings goals |
| PATCH/DELETE | `/api/savings-goals/[id]` | Update or delete a savings goal |
| GET/POST | `/api/accounts` | List or create bank accounts |
| POST | `/api/gamification/award` | Award XP and update streak |
| GET | `/api/gamification/badges` | Get badge status |
| POST | `/api/mobile/signin` | Mobile auth (returns JWT) |

---

## Gamification System

| Action | XP Reward |
|---|---|
| Import transactions | +50 XP |
| Stay under budget (per category) | +25 XP |
| Hit a savings milestone | +100 XP |
| Earn a badge | +200 XP |

**Leveling:** XP thresholds increase each level (Level 2 at 500 XP, Level 3 at 1,500 XP, etc.).

**Streaks:** Consecutive daily activity tracked. One missed day resets the streak.

**Badges** (10+): `first_xp`, `level_5`, `level_10`, `streak_7`, `streak_30`, `streak_100`, `xp_1000`, `xp_5000`, `xp_10000` — each with a rarity tier (Common → Legendary).

---

## CSV Import Format

BudgetBoss auto-detects columns. Supported layouts:

| Column | Required | Notes |
|---|---|---|
| Date | Yes | MM/DD/YYYY, YYYY-MM-DD, or MM-DD-YYYY |
| Description / Memo / Payee | Yes | Auto-detected |
| Amount | Yes* | Single column; negative = expense |
| Debit + Credit | Yes* | Two-column alternative |
| Category | No | Enables auto-categorization |

*Provide either Amount OR Debit+Credit columns.

Compatible with exports from: Rocket Money, Chase, Bank of America, and most standard bank CSV formats.

---

## Privacy & Security

- All financial data stays in **your own PostgreSQL database** — nothing is sent to third parties.
- Passwords are hashed with bcryptjs; plain-text credentials are never stored.
- CSV files are processed in-memory and not written to disk.
- Web sessions use NextAuth JWT cookies; mobile uses 30-day expiring JWT bearer tokens stored in device secure storage.

---

## Documentation

- [`DEVELOPER.md`](DEVELOPER.md) — Full developer setup, EAS build instructions, common issues
- [`ONBOARDING.md`](ONBOARDING.md) — End-user guide (features, CSV import, budgets, goals, gamification)

---

## License

MIT
