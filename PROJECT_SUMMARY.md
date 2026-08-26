# BUSIT — Project State & Architecture Summary

> Orientation document for AI agents and new contributors. Describes what this repo
> is, how it is built, what actually works, and where the sharp edges are.
> **Last verified against the code: 2026-08-27** (commit `839e0d1`).
> If you change architecture, data model, or routes, update this file.

---

## 1. What this is

**BUSIT** is a full-stack Next.js web app that digitises campus shuttle fare payment.
It replaces cash and dedicated hardware scanners with:

- a **student wallet** holding integer "credits",
- a **dynamic QR boarding pass** rendered client-side from the student's ID,
- a **driver portal** that scans that QR with the phone/laptop camera (pure software,
  `html5-qrcode`) and deducts a flat fare,
- **email receipts** for every fare and top-up, plus an **email OTP** flow to unblock
  a card the student has frozen.

Two roles exist: `STUDENT` and `DRIVER`. There is **no admin role and no admin UI**.

Origin/status: a working prototype, deployed to Vercel, backed by a hosted Postgres
(Neon). It is feature-complete for a demo but has real gaps before it could handle
money — see §10.

Repo: `https://github.com/TRITUSLegend/busit-web.git` (branch `main`).
`BUSIT_Complete_Documentation.pdf` at the repo root is an earlier prose/architecture
write-up of the same system (Project Overview, System Architecture, etc.); this file
is the code-accurate version and takes precedence where they disagree.

---

## 2. Current state — verified, not assumed

| Check | Result |
|---|---|
| `npx next build` | **Passes.** Compiles in ~8s (Turbopack), TypeScript clean, 10 static pages generated. |
| `npx eslint` | **20 problems: 14 errors, 6 warnings.** Not wired into the build, so it does not block deploys. See §9. |
| Tests | **None.** No test runner, no test files, no CI config. |
| Migrations | **None.** No `prisma/migrations/`; schema is applied with `prisma db push`. |
| Working tree | Clean except an untracked `kickbacks.vsix` (an unrelated VS Code extension file — not part of the project). |

Build emits one warning: Next infers the workspace root as `C:\Users\Aditya Raj Kar\`
because a stray `package-lock.json` sits there. Harmless locally; silence it by
setting `turbopack.root` in `next.config.ts` if it becomes annoying.

---

## 3. Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js **App Router**, Turbopack by default | `16.2.6` |
| React | React + React DOM | `19.2.4` |
| Language | TypeScript, `strict: true` | `^5` |
| ORM | Prisma Client | `^5.22.0` |
| Database | PostgreSQL (Neon in prod) | — |
| Auth | NextAuth.js, Credentials provider, **JWT sessions** | `^4.24.14` |
| Hashing | bcrypt, cost 10 | `^6.0.0` |
| Styling | Tailwind CSS v4 (PostCSS plugin, CSS-first `@theme`) | `^4` |
| QR generate | `qrcode` (data URL, client-side) | `^1.5.4` |
| QR scan | `html5-qrcode` (`Html5QrcodeScanner`) | `^2.3.8` |
| Email | `nodemailer` over Gmail SMTP | `^7.0.13` |

Path alias: `@/*` → `./src/*`. Note `types/` sits **outside** `src/`, so the
NextAuth type augmentation is picked up by `tsconfig`'s `**/*.ts` include, not by the alias.

`package.json` runs `prisma generate` on `postinstall` — required for Vercel builds.

### ⚠️ Next.js 16 is not the Next.js you remember

`AGENTS.md` (loaded via `CLAUDE.md`) mandates this and it is not boilerplate:
**read the relevant guide in `node_modules/next/dist/docs/` before writing code.**
Version 16 ships breaking changes relative to most training data — async request
APIs (`cookies()`, `headers()`, `params`, `searchParams` are all awaited),
`middleware.ts` renamed to `proxy.ts`, Turbopack on by default, `next lint` removed,
new caching APIs (`updateTag`, `refresh`, `cacheLife`), `next/image` default changes,
ESLint flat config required. Start at
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

---

## 4. Repository layout

```
├── AGENTS.md / CLAUDE.md      # CLAUDE.md is just "@AGENTS.md"; AGENTS.md = the Next 16 warning
├── PROJECT_SUMMARY.md         # this file
├── BUSIT_Complete_Documentation.pdf
├── README.md                  # user-facing setup + demo walkthrough
├── prisma/schema.prisma       # single source of truth for the data model
├── prisma/dev.db, ./dev.db    # STALE SQLite files, committed, no longer used (§10)
├── types/next-auth.d.ts       # augments Session.user with id / role / studentId
└── src/
    ├── app/
    │   ├── layout.tsx         # root: forced dark, Inter font, wraps SessionProvider
    │   ├── globals.css        # Tailwind v4 @theme tokens + .loader + .custom-scrollbar
    │   ├── page.tsx           # "/" — THE dashboard; branches student vs driver
    │   ├── login/page.tsx     # "/login"
    │   ├── register/page.tsx  # "/register"
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts   # NextAuth handler + exported authOptions
    │       ├── auth/register/route.ts        # POST create account
    │       ├── payment/add/route.ts          # POST top up own wallet (student)
    │       ├── payment/pay/route.ts          # POST charge a student (driver)
    │       └── user/status/route.ts          # GET dashboard data; POST block/OTP/unblock
    ├── components/
    │   ├── NextAuthProvider.tsx  # 'use client' SessionProvider wrapper
    │   ├── QRCodeDisplay.tsx     # studentId -> QR data URL via useEffect
    │   └── Scanner.tsx           # camera scanner + fires the pay call
    └── lib/
        ├── prisma.ts          # singleton PrismaClient (globalThis cache in dev)
        └── email.ts           # 3 nodemailer senders, inline-styled HTML
```

Every page under `src/app/` is a **client component** (`'use client'`). There are no
server components doing data fetching, no server actions, no `middleware.ts`/`proxy.ts`.
All data flows through the REST-ish route handlers via `fetch`.

---

## 5. Data model (`prisma/schema.prisma`)

```prisma
model User {
  id         String   @id @default(uuid())
  studentId  String   @unique   // login identifier AND the QR payload
  name       String
  email      String   @unique
  password   String              // bcrypt hash, cost 10
  role       String   @default("STUDENT")  // "STUDENT" | "DRIVER"  (string, not enum)
  credits    Int      @default(0)          // integer credits, no decimals/currency
  cardStatus String   @default("ACTIVE")   // "ACTIVE" | "BLOCKED"  (string, not enum)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  unblockOtp       String?     // plaintext 6-digit code
  unblockOtpExpiry DateTime?   // now + 10 min
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

Facts that matter when writing code against this:

- `role` and `cardStatus` are **plain strings**, not Prisma enums. Compare with the
  exact literals above; nothing validates them at the DB level.
- `studentId` is also the driver's ID (drivers register with e.g. `DRV-001`). The
  column name is a misnomer; it means "login/user ID" everywhere.
- `Transaction.amount` carries the sign. The dashboard renders `+` only when `> 0`.
- Drivers have `credits` and `cardStatus` columns too; they are simply never used.
- Schema changes are applied with `npx prisma db push` (no migration history).

---

## 6. Auth

- **Provider:** NextAuth Credentials only. Fields are `studentId` + `password`;
  there is no email login.
- **Strategy:** JWT (`session.strategy = "jwt"`), no database session table.
- **Callbacks:** `jwt` copies `id`, `role`, `studentId` onto the token; `session`
  copies them onto `session.user`. `types/next-auth.d.ts` declares them so
  `session.user.role` typechecks.
- **Sign-in page:** `/login` (`pages.signIn`).
- `authOptions` is **exported from `src/app/api/auth/[...nextauth]/route.ts`** and
  imported by the other route handlers via relative paths like
  `'../../auth/[...nextauth]/route'`. This currently builds fine on 16.2.6. If you
  ever hit an "invalid route export" error, lift `authOptions` into
  `src/lib/auth.ts` and re-import from both places — that is the modern convention.
- **Route protection is client-side only.** `src/app/page.tsx` redirects to `/login`
  in a `useEffect` when `status === 'unauthenticated'`. Server-side enforcement
  exists solely inside each route handler via `getServerSession(authOptions)`.
  There is no middleware/proxy gate.
- The **Student/Driver tabs on `/login` are cosmetic** — they only change labels and
  placeholders. The real role comes from the DB record. On `/register` the tab *is*
  meaningful: it is sent as the `role` field.

---

## 7. API reference

All handlers live in `src/app/api/**/route.ts`, return JSON, and wrap their body in
`try/catch` returning `{ error: 'Internal server error' }` with 500.

### `POST /api/auth/register`
Public. Body `{ studentId, name, email, password, role? }`.
Rejects missing fields (400) and duplicate `studentId` **or** `email` (400,
`"User already exists"`). Hashes with bcrypt(10), creates the user with
`role || 'STUDENT'`, returns `{ success: true, user: { id, name } }`.
No password strength rules, no email verification, no rate limiting — anyone can
self-register as a `DRIVER`.

### `GET /api/user/status`
Any authenticated user. Looks the caller up by `session.user.studentId` and returns
`{ success, user: { name, studentId, credits, cardStatus, transactions } }` with the
**10 most recent** transactions, newest first. This is the dashboard's only read.

### `POST /api/user/status`
Any authenticated user. Body `{ action, otp? }` where `action` is one of:

- `BLOCK` — sets `cardStatus = 'BLOCKED'` immediately, no confirmation beyond the
  browser `confirm()` in the UI.
- `REQUEST_OTP` — 400 if the card is already `ACTIVE`. Generates a 6-digit code
  (`Math.random`), stores it plus a `now + 10min` expiry, and **awaits**
  `sendUnblockOtpEmail`. The await is deliberate: commit `839e0d1` fixed a Vercel
  freeze caused by not awaiting it in a serverless function.
- `VERIFY_UNBLOCK` — requires `otp`. Compares the stored plaintext code, checks
  expiry, then sets `cardStatus = 'ACTIVE'` and clears both OTP columns.

Note there is **no role check** here; a driver could block/unblock their own unused card.

### `POST /api/payment/add`
Requires `session.user.role === 'STUDENT'` (401 otherwise). Body `{ amount }`,
must be `> 0`. Runs `prisma.$transaction([...])` incrementing `credits` and inserting
a `TOP_UP` row, then fire-and-forgets `sendTopUpReceipt`.
**There is no payment gateway.** A student credits their own wallet by any amount for
free; the code comment acknowledges this is where Stripe/Razorpay webhook verification
would go.

### `POST /api/payment/pay`
Requires `session.user.role === 'DRIVER'` (401 otherwise). Body `{ studentId }`.
Looks up the student → 404 if missing, 400 if `cardStatus !== 'ACTIVE'`, 400 if
`credits < FARE`. **`FARE = 20` is a hardcoded constant inside this file** — that is
the single place the fare is defined. On success runs `prisma.$transaction([...])`
decrementing credits and inserting a `PAYMENT` row with `amount: -FARE`, then
fire-and-forgets `sendPaymentReceipt`.

---

## 8. Feature flows & UI

**Dashboard (`src/app/page.tsx`)** is one client component holding both roles.
`isDriver = session.user.role === 'DRIVER'`.

- *Driver view*: heading + `<Scanner />`. Nothing else — no ride history, no earnings.
- *Student view*: balance card + `cardStatus` pill → boarding pass → action buttons →
  last-10 activity list. When `cardStatus !== 'ACTIVE'` the QR is replaced by a red
  "Card Blocked" panel, so a blocked card cannot even render a pass.
- The action button area is a 3-way branch: `ACTIVE` → "Block Card";
  `BLOCKED` + `showOtpInput` → OTP input + Verify + Cancel; `BLOCKED` otherwise →
  "Request Unblock OTP".
- Interaction still uses native `confirm()` / `prompt()` / `alert()` (e.g. "Enter
  credits to add"). Deliberately minimal, not a design system.

**Scan → charge flow:** `Scanner.tsx` mounts `Html5QrcodeScanner` on `#reader` at
10fps with a 250×250 box. On decode it stores the ID, POSTs to `/api/payment/pay`, and
pauses the scanner. Success/error text shows for 3s. **The scanner cannot resume
itself** — the code comments say so, and the only way to scan again is the
"Scan Next" button, which calls `window.location.reload()`. The `useEffect` also
depends on `[loading, scannedId]`, so it tears down and rebuilds the whole scanner
on every state change during a scan.

**QR contents:** `QRCodeDisplay.tsx` encodes the **raw `studentId` string** and
nothing else — no signature, no nonce, no timestamp.

**Styling conventions:** Tailwind v4 utilities inline, zinc palette, dark forced via
`className="dark"` on `<html>`, emerald for positive/active, red for blocked/negative.
Custom tokens (`--color-zinc-950/900/800`) are defined in `@theme` in `globals.css`
alongside two hand-written classes: `.loader` and `.custom-scrollbar`.
`Scanner.tsx` references a `.btn-primary` class **that is not defined anywhere** —
that button renders unstyled.

**Emails (`src/lib/email.ts`):** three senders — `sendPaymentReceipt`,
`sendTopUpReceipt`, `sendUnblockOtpEmail`. All share one Gmail transporter, all
no-op silently if `SMTP_EMAIL`/`SMTP_PASSWORD` are unset, all build inline-styled
HTML, all swallow errors into `console.error`, and all stamp dates with
`timeZone: 'Asia/Kolkata'` (fixed in `cc9015b` — keep it explicit; serverless
defaults to UTC). The payment receipt adds a low-balance warning under 40 CR.

---

## 9. Lint state (14 errors / 6 warnings, non-blocking)

- **`@typescript-eslint/no-explicit-any` ×11** — spread across the NextAuth callbacks,
  the `catch (error: any)` blocks, and `useState<any>` for user data + `tx: any` in the
  dashboard map. Typing the dashboard user shape is the highest-value cleanup.
- **`react-hooks/immutability` ×2** (real, and worth fixing) —
  `Scanner.tsx:23` and `page.tsx:22` call a function before its `const` declaration
  from inside a hook, so the closure can capture a stale value.
- **`@next/next/no-img-element`** — the QR uses `<img>`; that is correct here, since
  `next/image` cannot optimise a client-generated data URL.
- Unused: `useRef` in `Scanner.tsx`, two `err` params, `NextAuth` in the `.d.ts`
  (the import is required for module augmentation — safe to ignore), and `req` in
  the `GET` handler.

---

## 10. Known gaps and risks

Ordered roughly by how much they matter if this ever handles real value.

1. **The QR pass is a bare, replayable student ID.** Screenshot it, photograph
   someone's screen, or just type the ID — the charge succeeds. A fix means signing
   the payload with a rotating short-lived token (HMAC + timestamp) and verifying it
   server-side in `/api/payment/pay`.
2. **Top-ups are free.** `/api/payment/add` mints credits with no payment provider.
3. **No scan de-duplication.** Scanning the same student twice charges twice; nothing
   tracks a ride, a bus, a route, or a time window.
4. **TOCTOU on the fare check.** `/api/payment/pay` reads `credits`, then decrements
   in a separate `$transaction`. Two concurrent scans can both pass the
   `credits < FARE` check. Fix with a conditional `updateMany` on
   `{ credits: { gte: FARE } }` and a count check, or an interactive transaction.
5. **Receipt emails are fire-and-forget** in `/api/payment/pay` and
   `/api/payment/add` (`sendX(...).catch(console.error)`). On Vercel the function can
   be frozen the moment the response returns, so these can silently never send —
   exactly the bug fixed for the OTP path in `839e0d1`, still present here. Either
   `await` them or move them to a queue/`after()`.
6. **OTP hardening:** stored in plaintext, generated with `Math.random`, no attempt
   counter, no rate limit on `REQUEST_OTP`, no lockout. `VERIFY_UNBLOCK` also does a
   non-constant-time string compare.
7. **Anyone can register as a DRIVER** via the public `/register` tab.
8. **No server-side route guarding.** Add `proxy.ts` (Next 16's renamed middleware)
   if you want auth enforced before the page renders.
9. **`log: ['query']` is on unconditionally** in `src/lib/prisma.ts`, so production
   logs every SQL statement.
10. **Stale committed SQLite files.** `dev.db` and `prisma/dev.db` are tracked in git
    but the datasource has been `postgresql` since `2448856`. They are dead weight and
    may contain old local test accounts — safe to delete.
11. **No migrations, no tests, no CI.**
12. **Secrets hygiene:** `.env` is correctly gitignored (`.env*`), but the local file
    holds live Neon and Gmail app-password credentials. Never print or commit it.

---

## 11. Environment & commands

`.env` at the repo root (gitignored). Required keys:

```env
DATABASE_URL="postgresql://..."   # Neon or any Postgres; must match schema provider
NEXTAUTH_SECRET="<random string>"
NEXTAUTH_URL="http://localhost:3000"
SMTP_EMAIL="<gmail address>"
SMTP_PASSWORD="<16-char Gmail app password>"
```

Email senders no-op without the SMTP pair, so the app runs fine locally without them.

```bash
npm install          # runs prisma generate via postinstall
npx prisma db push   # apply schema (no migrations in this project)
npm run dev          # http://localhost:3000
npm run build        # production build (Turbopack)
npm run start
npm run lint         # `eslint` — flat config, not `next lint` (removed in 16)
npx prisma studio    # inspect/edit data
```

**Manual test of the core loop** (there is no automated test): register a STUDENT in
one browser, register a DRIVER in an incognito window, top up the student, grant the
driver camera permission, point the driver's camera at the student's QR. 20 CR should
disappear and a receipt should arrive.

**Deployment:** Vercel, serverless. Set the five env vars in the project settings,
point `DATABASE_URL` at Neon, and run `npx prisma db push` locally against the cloud
URL to sync the schema. Keep serverless constraints in mind — cold starts, the
frozen-after-response behaviour behind gap #5, and one Prisma connection per instance.

---

## 12. Conventions to follow

- **Read `node_modules/next/dist/docs/` before writing Next.js code.** Non-negotiable
  per `AGENTS.md`; v16 diverges from most priors.
- Route handlers: `getServerSession(authOptions)` first, role check second, parse and
  validate the body third, `NextResponse.json({ error }, { status })` on every failure.
- Multi-write operations go through `prisma.$transaction([...])`.
- Import Prisma as `import { prisma } from '@/lib/prisma'` — never construct a client.
- Client components own all interactivity; keep pages `'use client'` unless you are
  deliberately introducing server components.
- Money is an integer count of credits. Do not introduce floats.
- Role and status literals are `'STUDENT' | 'DRIVER'` and `'ACTIVE' | 'BLOCKED'`,
  compared as strings.
- Tailwind utilities inline; only add to `globals.css` for genuinely reusable pieces.
- New emails go in `src/lib/email.ts`, follow the existing HTML shell, keep
  `timeZone: 'Asia/Kolkata'`, and **await the send in serverless handlers**.
