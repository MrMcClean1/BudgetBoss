# BudgetBoss

A gamified personal finance web app. Import your CSV transactions, track spending, maintain budget streaks, earn XP, and watch savings goals progress — all with your data stored privately in your own database.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 (email + password) |
| Styling | Tailwind CSS |
| Testing | Vitest |
| CI | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL running locally (or update `DATABASE_URL` in `.env`)

### Setup

```bash
# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env: set DATABASE_URL and AUTH_SECRET

# Run database migrations
npm run db:migrate

# Seed with demo data
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `alex@example.com` / `password123`

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/budgetboss"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

## CSV Import

BudgetBoss accepts CSV exports from Rocket Money and most bank export formats. Required columns (auto-detected):

- **Date** — any standard date format
- **Description** / Memo / Payee
- **Amount** (single column, negative = expense) OR **Debit** + **Credit** columns

Optional: **Category** column for auto-categorization.

## Development

```bash
npm run dev          # Dev server
npm test             # Run unit tests
npm run test:watch   # Watch mode
npm run lint         # Lint
npm run db:studio    # Prisma Studio (DB GUI)
npm run db:generate  # Regenerate Prisma client
```

## Project Structure

```
app/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (auth)/register/     # Register page
│   ├── (dashboard)/dashboard/ # Main dashboard
│   └── api/
│       ├── auth/            # NextAuth handlers + register
│       └── transactions/import/ # CSV import endpoint
├── lib/
│   ├── auth.ts              # NextAuth config
│   └── prisma.ts            # Prisma client singleton
├── prisma/
│   ├── schema.prisma        # Data model
│   └── seed.ts              # Dev seed data
└── __tests__/               # Unit tests
```
