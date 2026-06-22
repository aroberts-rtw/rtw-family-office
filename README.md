# RTW Family Office

Personal financial operating system for the Roberts household. Unified view across personal finances, investments, business performance, tax planning, insurance, and subscriptions — built as a family office, not a consumer app.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Clerk (Askia + Shelbie) |
| Database | Neon PostgreSQL + Prisma |
| Financial data | Plaid (accounts, transactions, investments, liabilities) |
| Business data | QuickBooks Online via MCP |
| Hosting | Vercel |
| Agent | Claude API |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:
- **Clerk** → [clerk.com](https://clerk.com) → create app → copy keys → invite Shelbie as member
- **Neon** → [neon.tech](https://neon.tech) → create database → copy `DATABASE_URL`
- **Plaid** → [dashboard.plaid.com](https://dashboard.plaid.com) → Team → Keys → copy `client_id` + `secret`

### 3. Push database schema

```bash
npm run db:push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Phases

- [x] **Phase 1** — Foundation: Plaid, accounts, transactions, net worth, Neon DB, Clerk auth
- [ ] **Phase 2** — Intelligence: Agent chat interface, goal tracking, subscription detection, alerts
- [ ] **Phase 3** — Advisory: Tax module, investment advisory, insurance inventory, QBO integration

## Architecture

```
Plaid (personal)   ──┐
QBO MCP (firm)     ──┼──► Neon Postgres ──► Next.js on Vercel
                      │         │                   │
                      │    Claude Agent             │
                      │         │                   │
                      └─── MCP Server ◄─────────────┘
```
