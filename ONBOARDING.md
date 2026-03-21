# BudgetBoss — Client Onboarding Guide

## Overview

BudgetBoss is a gamified personal finance web app. Import your bank transactions, track spending against budgets, earn XP for healthy habits, and watch your savings goals grow — all stored privately in your own database.

---

## 1. Getting Started

### Create Your Account

1. Navigate to the BudgetBoss URL provided by your administrator.
2. Click **Register** on the login screen.
3. Enter your email address and a secure password.
4. You will be redirected to your dashboard immediately.

> **Demo access:** Use `alex@example.com` / `password123` on a local dev instance to explore all features before committing your own data.

---

## 2. Core Features

### Dashboard

Your home base. At a glance you can see:
- **Spending summary** — total expenses this month vs. budget
- **XP & streak counter** — your gamification progress
- **Top categories** — where your money is going
- **Savings goal progress bars**
- **Recent transactions**

### Transactions

All imported transactions live here. You can:
- Filter by date range, category, or amount
- Manually edit transaction descriptions or categories
- Search by payee name or keyword

### Budgets

Set monthly spending limits by category (e.g., Dining, Groceries, Entertainment). BudgetBoss will alert you as you approach or exceed limits, and award XP for staying within budget.

### Savings Goals

Create a goal (e.g., "Emergency Fund — $5,000"), set a target date, and BudgetBoss calculates a monthly contribution target. Progress bars update automatically as linked transactions are categorized.

### Badges

Earn badges for milestones:
- **First import** — upload your first CSV
- **30-day streak** — stay under budget for 30 consecutive days
- **Goal Crusher** — hit a savings target
- **Power Saver** — spend 20%+ under budget in any month

---

## 3. Importing Transactions (CSV)

BudgetBoss accepts CSV exports from Rocket Money and most major banks.

### Supported Formats

| Column | Required | Notes |
|---|---|---|
| Date | Yes | Any standard format (MM/DD/YYYY, YYYY-MM-DD, etc.) |
| Description / Memo / Payee | Yes | Auto-detected |
| Amount | Yes* | Single column; negative = expense |
| Debit + Credit | Yes* | Alternative to single Amount column |
| Category | No | Enables auto-categorization |

*Provide either Amount OR Debit + Credit — not both.

### Step-by-Step Import

1. Export your transactions from your bank or Rocket Money as a CSV file.
2. In BudgetBoss, go to **Transactions → Import**.
3. Click **Choose File** and select your CSV.
4. BudgetBoss will preview the detected column mappings.
5. Confirm and click **Import** — transactions appear instantly.

> **Tip:** Run imports monthly right after your statement closes for clean data.

---

## 4. Setting Up Budgets

1. Go to **Budgets → New Budget**.
2. Select a category (or create a custom one).
3. Set your monthly spending limit.
4. Save — the budget is now live and tracking.

BudgetBoss auto-categorizes transactions when a **Category** column is present in your CSV. You can always recategorize manually.

---

## 5. Savings Goals

1. Go to **Savings Goals → New Goal**.
2. Name the goal (e.g., "Vacation Fund").
3. Set the target amount and target date.
4. BudgetBoss calculates the monthly savings rate needed.
5. Categorize relevant deposits/transfers to update progress.

---

## 6. Gamification — XP & Streaks

BudgetBoss rewards consistent financial discipline:

| Action | XP Reward |
|---|---|
| Import transactions | +50 XP |
| Stay under budget (category) | +25 XP per category |
| Hit a savings milestone | +100 XP |
| Earn a badge | +200 XP |
| 7-day on-budget streak | +75 XP bonus |

Streaks reset if you exceed your total monthly budget. Partial category overruns do not break the streak.

---

## 7. Privacy & Data

- All data is stored in **your own PostgreSQL database** — BudgetBoss does not transmit financial data to any third party.
- Passwords are hashed; plain-text credentials are never stored.
- CSV files are processed in-memory and not persisted to disk after import.

---

## 8. Administrator Setup (Self-Hosted)

For teams or individuals running their own instance:

### Prerequisites
- Node.js 22+
- PostgreSQL

### Quick Setup

```bash
git clone <repo>
cd app
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run db:seed   # Optional: load demo data
npm run dev       # Development
npm start         # Production
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/budgetboss"
AUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"
```

---

## 9. Support & Troubleshooting

| Issue | Fix |
|---|---|
| CSV import fails | Confirm Date, Description, and Amount/Debit+Credit columns exist |
| Transactions show wrong category | Manually edit the transaction category |
| Budget not updating | Refresh the page; budgets recalculate on each load |
| Forgot password | Contact your administrator to reset via the database |

---

## 10. Onboarding Checklist

- [ ] Create account
- [ ] Import first CSV (earn your first badge)
- [ ] Set at least 3 budget categories
- [ ] Create 1 savings goal
- [ ] Explore the Badges page
- [ ] Check dashboard after 7 days

---

*BudgetBoss — own your finances, earn your wins.*
