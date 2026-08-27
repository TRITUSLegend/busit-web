# Agent Brief — BUSIT

> Agent brief for this repo — read it before changing anything. Kept deliberately short.
> **[ARCHITECTURE.md](./ARCHITECTURE.md) is the canonical reference** — stack, data
> model, API contracts, auth flow, scan flow, and known gaps all live there. Read it
> before changing anything; do not duplicate its content back into this file.

## Before writing Next.js code

`AGENTS.md` requires it and it is not boilerplate: **read the relevant guide in
`node_modules/next/dist/docs/`**. This is Next.js 16.2.6, which breaks from most
training data — `cookies()`/`headers()`/`params`/`searchParams` are async,
`middleware.ts` is now `proxy.ts`, `next lint` is removed, Turbopack is default, and
`next build` no longer runs linting. Start at
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

## Verified state (2026-08-27)

`npm run type-check`, `npm run lint`, and `npm run build` all pass with **zero errors
and zero warnings**. Build emits 9 routes. Keep it that way — if a change introduces
a lint error, fix the cause rather than widening a suppression.

Still absent by design: **no tests, no CI, no Prisma migrations** (schema is applied
with `prisma db push`).

## Non-obvious facts that cause bugs if assumed away

- **`studentId` is the login field**, not email — for drivers too, despite the name.
  It is also the raw QR payload.
- **`role` and `cardStatus` are plain strings**, not Prisma enums:
  `"STUDENT" | "DRIVER"`, `"ACTIVE" | "BLOCKED"`.
- **`FARE = 20` is a constant inside `src/app/api/payment/pay/route.ts`** — the only
  place it is defined.
- **Every `send*` email call must stay awaited.** Vercel freezes the function once the
  response is sent, so an un-awaited promise is silently dropped. Do not "optimise"
  these back into fire-and-forget.
- **`Scanner.tsx` cannot self-resume** after a scan; `window.location.reload()` via
  the "Scan Next" button is the intentional mechanism. Its `useEffect` deps
  `[loading, scannedId]` are deliberate.
- **Auth config lives in `src/lib/auth.ts`**, not in the NextAuth route file.
  `types/next-auth.d.ts` augments `User`, `JWT`, and `Session`, so `id`/`role`/
  `studentId` type-check with no assertions — add fields there, never with `as any`.
- **Prisma is a singleton**: `import { prisma } from '@/lib/prisma'`. Never construct
  a client.
- **`turbopack.root` in `next.config.ts` is load-bearing**, not leftover boilerplate.
  A stray `package-lock.json` in the user's home directory otherwise makes Next infer
  the workspace root as that directory. Deleting the pin brings back a build warning
  and rewidens module resolution and file watching to everything above the project.

## Conventions

- Route handlers: `getServerSession(authOptions)` → role check → validate body →
  `NextResponse.json({ error }, { status })` on every failure. Each handler carries a
  JSDoc block documenting body, status codes, and side effects; update it when you
  change behaviour.
- Multi-write operations go through `prisma.$transaction([...])`.
- Money is an integer count of credits. Never introduce floats.
- Pages are client components; keep them that way unless deliberately introducing
  server components.
- Tailwind utilities inline. Add to `globals.css` only for genuinely reusable pieces.
- New emails go in `src/lib/email.ts`, follow the existing HTML shell, and keep
  `timeZone: 'Asia/Kolkata'`.

## Rollback

`git checkout mvp-checkpoint` returns to the pre-cleanup working MVP.
