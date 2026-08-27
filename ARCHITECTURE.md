# BUSIT — Architecture Reference

> Code-accurate reference document. Last verified: 2026-08-27.
> If you change architecture, routes, or the data model, update this file.

---

## What It Does

BUSIT replaces cash payments on college shuttle buses with a digital credit-wallet
system. Students hold integer "credits"; drivers scan a QR code to deduct a flat fare
of 20 credits. No hardware scanners, no payment hardware — the entire system runs in
a browser.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| React | React + React DOM | 19.2.4 |
| Language | TypeScript (`strict: true`) | ^5 |
| ORM | Prisma Client | ^5.22.0 |
| Database | PostgreSQL (Neon in prod) | — |
| Auth | NextAuth.js, Credentials provider, JWT sessions | ^4.24.14 |
| Hashing | bcrypt (cost 10) | ^6.0.0 |
| Styling | Tailwind CSS v4 (PostCSS, CSS-first `@theme`) | ^4 |
| QR generate | `qrcode` (data URL, client-side) | ^1.5.4 |
| QR scan | `html5-qrcode` (`Html5QrcodeScanner`) | ^2.3.8 |
| Email | `nodemailer` over Gmail SMTP | ^7.0.13 |
| Deployment | Vercel (serverless) | — |

> ⚠️ **Next.js 16 breaks from prior versions.** `cookies()`, `headers()`, `params`,
> and `searchParams` are all async. `middleware.ts` is renamed `proxy.ts`. `next lint`
> is removed; use `eslint` directly, and note that `next build` no longer runs linting.
> Always read
> `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before
> writing Next.js code.

---

## Project Structure

```
busit-web/
├── prisma/
│   ├── schema.prisma        # Single source of truth: User + Transaction models
│   └── seed.ts              # Demo data — run with: npx prisma db seed
├── types/
│   └── next-auth.d.ts       # Augments User, JWT, and Session with id/role/studentId
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout: dark mode forced, Inter font, SessionProvider
│   │   ├── globals.css      # Tailwind v4 @theme tokens + .btn-primary + .loader + .custom-scrollbar
│   │   ├── page.tsx         # "/" — main dashboard, branches on role (student vs driver)
│   │   ├── login/page.tsx   # "/login"
│   │   ├── register/page.tsx # "/register"
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth GET+POST handler
│   │       ├── auth/register/route.ts       # POST: create account
│   │       ├── payment/add/route.ts         # POST: top up credits (student only)
│   │       ├── payment/pay/route.ts         # POST: deduct fare (driver only)
│   │       └── user/status/route.ts         # GET: dashboard data; POST: block/OTP/unblock
│   ├── components/
│   │   ├── NextAuthProvider.tsx  # 'use client' SessionProvider wrapper
│   │   ├── QRCodeDisplay.tsx     # Encodes studentId into a QR data URL
│   │   └── Scanner.tsx           # Camera QR scanner → POST /api/payment/pay
│   └── lib/
│       ├── prisma.ts        # Singleton PrismaClient (globalThis guard for HMR safety)
│       ├── auth.ts          # NextAuth authOptions (extracted for reuse)
│       └── email.ts         # 3 nodemailer senders with inline-styled HTML
├── .env.example             # Required env var template (safe to commit)
├── ARCHITECTURE.md          # This file
├── README.md                # Setup + demo walkthrough
└── next.config.ts           # Pins turbopack.root — see PROJECT_SUMMARY.md
```

Every page under `src/app/` is a **client component** (`'use client'`). There are
no server components doing data fetching and no server actions. All data flows
through the REST route handlers via `fetch`.

---

## Data Model

```prisma
model User {
  id         String   @id @default(uuid())
  studentId  String   @unique   // login identifier AND the QR payload; misnomer — drivers use it too
  name       String
  email      String   @unique
  password   String              // bcrypt hash, cost 10
  role       String   @default("STUDENT")  // "STUDENT" | "DRIVER" — plain string, not enum
  credits    Int      @default(0)
  cardStatus String   @default("ACTIVE")   // "ACTIVE" | "BLOCKED" — plain string, not enum
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  unblockOtp       String?
  unblockOtpExpiry DateTime?
  transactions Transaction[]
}

model Transaction {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  amount    Int      // POSITIVE for TOP_UP, NEGATIVE for PAYMENT
  type      String   // "PAYMENT" | "TOP_UP"
  timestamp DateTime @default(now())
}
```

- `role` and `cardStatus` are **plain strings**, not Prisma enums. Compare against
  the exact literals above — nothing validates them at the DB level.
- `Transaction.amount` carries the sign. The dashboard shows `+` only when `> 0`.
- Drivers have `credits` and `cardStatus` columns too; they are simply never used.
- Schema changes are applied with `npx prisma db push` (no migration history).

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account (student or driver) |
| GET | `/api/user/status` | Any session | Fetch own profile + last 10 transactions |
| POST | `/api/user/status` | Any session | Block card / request OTP / verify unblock |
| POST | `/api/payment/add` | STUDENT only | Top up own wallet (no payment gateway) |
| POST | `/api/payment/pay` | DRIVER only | Deduct FARE (20 credits) from a student |

Each handler carries a JSDoc block documenting its body, every status code it can
return, and its side effects. Read that before changing a route.

---

## Core Scan Flow (the main feature)

```
1.  Driver opens "/" → role === 'DRIVER' → Scanner component mounts
2.  Html5QrcodeScanner activates device camera at 10fps, 250×250px viewport
3.  Student holds their QR code up to the camera
4.  html5-qrcode decodes the QR → extracts the raw studentId string
5.  Scanner POSTs { studentId } to /api/payment/pay
6.  Server: validates DRIVER session → looks up student → checks cardStatus ACTIVE
             → checks credits >= 20 → runs prisma.$transaction:
               [ UPDATE credits -= 20, INSERT Transaction(amount: -20, type: PAYMENT) ]
             → awaits sendPaymentReceipt (email)
7.  Server returns { success: true, message: 'Payment successful' }
8.  Scanner shows result for 3s; driver clicks "Scan Next" → window.location.reload()
    (The scanner cannot self-resume — reload is the intentional mechanism.)
```

The student's balance is not pushed back to their screen; they see the new figure on
their next dashboard fetch, and immediately in the emailed receipt.

---

## Authentication Flow

```
1. User submits studentId + password on /login
2. NextAuth Credentials provider calls authorize({ studentId, password })
3. authorize() runs prisma.user.findUnique({ where: { studentId } })
4. bcrypt.compare(submitted, storedHash) — constant-time comparison
5. On success → NextAuth signs a JWT; the jwt callback adds { id, role, studentId }
6. JWT stored in an HttpOnly cookie (fully managed by NextAuth)
7. Server route handlers: getServerSession(authOptions) to read the session
8. Client components: useSession() from next-auth/react
9. types/next-auth.d.ts augments User, JWT, and Session so id/role/studentId
   type-check end to end with no assertions
```

The Student/Driver tabs on `/login` are **cosmetic** — they only swap labels and
placeholders. The real role comes from the database record. On `/register` the tab
*is* meaningful: it is submitted as the `role` field.

Route protection is enforced **inside each route handler**. The dashboard's redirect
to `/login` is a client-side `useEffect`, not a server-side gate.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon in prod) | Yes |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `NEXTAUTH_URL` | Full app URL, no trailing slash | Yes |
| `SMTP_EMAIL` | Gmail address for sending receipts | No (emails silently no-op) |
| `SMTP_PASSWORD` | 16-char Google App Password | No |

---

## Local Development

```bash
git clone https://github.com/TRITUSLegend/busit-web.git
cd busit-web
npm install                 # also runs prisma generate (postinstall)
cp .env.example .env        # fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npx prisma db push          # create schema on your Postgres instance
npx prisma db seed          # seed demo accounts
npm run dev                 # http://localhost:3000
```

Demo accounts (after seeding):

| Role | Login (studentId) | Password |
|---|---|---|
| Student | STUDENT-DEMO | busit123 |
| Driver | DRIVER-DEMO | busit123 |

### Testing the core scan loop (manual — no automated tests exist)

1. Log in as STUDENT-DEMO in one tab (or window)
2. Open an incognito window, log in as DRIVER-DEMO
3. Top up the student's wallet first if credits are 0
4. On the driver view, grant camera permission
5. Point the driver camera at the student's QR code
6. 20 credits deducted; receipt email sent (if SMTP is configured)

---

## Deployment (Vercel)

1. Import the GitHub repo into Vercel
2. Set all five environment variables in the Vercel project settings
3. `DATABASE_URL` must point to your Neon PostgreSQL instance
4. First deploy: run `DATABASE_URL=<neon_url> npx prisma db push` locally to sync schema
5. Subsequent deploys are automatic on push to `main`
6. `postinstall: prisma generate` runs automatically during Vercel's build

**Serverless constraint worth knowing:** the function is frozen the moment its
response is sent, so any promise not awaited by then is silently dropped. Every
`send*` email call in this codebase is awaited for exactly that reason — do not
"optimise" them back into fire-and-forget.

---

## Known Gaps (intentional demo limitations)

1. **QR is a bare, replayable student ID** — no HMAC signature or expiry
2. **Top-ups are free** — no payment gateway; Stripe/Razorpay integration placeholder
3. **No scan deduplication** — scanning the same student twice charges twice
4. **TOCTOU on fare check** — two concurrent scans could both pass the balance check
5. **OTP is plaintext, generated with Math.random** — not production-grade
6. **Anyone can self-register as DRIVER** — no invite/approval flow
7. **No server-side route guarding** — auth enforced only inside route handlers
8. **No tests, no CI, no migrations**

---

## Rollback

The working MVP state is tagged in git:
```bash
git checkout mvp-checkpoint
```
