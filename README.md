# 🚌 BUSIT — Digital Shuttle Credit System

> A full-stack campus shuttle fare system that replaces cash with QR-code digital
> wallets — no hardware scanners, no cash handling, instant receipts.

**Live app:** https://busit-web.vercel.app

---

## The Problem

Cash payments on shuttle buses create queues during peak hours, slow boarding, and
burden drivers with change. BUSIT is a software-only alternative: students load
credits, show a QR code, and the driver's phone does the rest.

---

## Features

- **Software-only QR scanning** — drivers use the built-in browser camera portal
  (`html5-qrcode`), no proprietary hardware
- **Digital boarding pass** — unique QR generated on registration, displayed on the
  student dashboard
- **Instant fare deduction** — 20-credit flat fare via an atomic Prisma transaction
- **Card freeze/unblock** — students can block their own card; OTP flow to unblock
- **Automated email receipts** — HTML receipts on every fare and top-up (Gmail SMTP)
- **Two-role system** — separate student and driver dashboards from a single page
- **Serverless-ready** — deployed on Vercel, backed by Neon PostgreSQL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | NextAuth.js v4 — Credentials, JWT sessions |
| Styling | Tailwind CSS v4 |
| Email | Nodemailer (Gmail SMTP) |
| QR | `qrcode` (generate) + `html5-qrcode` (scan) |
| Deployment | Vercel |

For the full architecture breakdown, data flows, and API reference: see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Local Setup

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- A PostgreSQL instance (local, [Neon](https://neon.tech) free tier, or [Railway](https://railway.app))
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords)
  (optional — email senders silently no-op without it; the app still runs)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/TRITUSLegend/busit-web.git
cd busit-web
npm install

# 2. Configure environment
cp .env.example .env
# Open .env and fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# SMTP_EMAIL and SMTP_PASSWORD are optional

# 3. Set up the database
npx prisma db push    # creates the schema
npx prisma db seed    # creates demo accounts

# 4. Start the development server
npm run dev
# → http://localhost:3000
```

### Demo accounts (after seeding)

| Role | Login (studentId field) | Password |
|---|---|---|
| Student | STUDENT-DEMO | busit123 |
| Driver | DRIVER-DEMO | busit123 |

> Log in with the **studentId**, not the email address — that is the credential
> field the app authenticates on.

---

## Testing the Core Flow

1. Log in as **STUDENT-DEMO** in one window
2. Top up the student's wallet (use any amount)
3. Open an incognito window, log in as **DRIVER-DEMO**
4. On the driver view, allow camera access
5. Point the driver's camera at the student's QR code on the other screen
6. 20 credits deducted instantly; receipt email sent (if SMTP configured)

---

## Available Scripts

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint (flat config — not next lint, which is removed in v16)
npm run type-check   # TypeScript check without emitting
npm run db:push      # Apply schema changes (no migrations in this project)
npm run db:seed      # Seed demo accounts
npm run db:studio    # Visual database editor
```

---

## Deployment

1. Fork and import the repo into [Vercel](https://vercel.com)
2. Create a free PostgreSQL database at [Neon](https://neon.tech)
3. Add all five environment variables from `.env.example` in Vercel project settings
4. From your local machine, run:
   ```bash
   DATABASE_URL=<your_neon_url> npx prisma db push
   ```
5. Deploy — Vercel runs `prisma generate` automatically via `postinstall`

---

## Project Status

This is a working prototype, deployed and functional end to end. It is **not**
hardened for real money — the QR pass is a replayable plain ID and top-ups mint
credits with no payment gateway. See
[Known Gaps](./ARCHITECTURE.md#known-gaps-intentional-demo-limitations) for the
full list before building on it.

---

## Rollback

The working MVP is tagged in git:
```bash
git checkout mvp-checkpoint
```
