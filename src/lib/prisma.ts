/**
 * src/lib/prisma.ts
 *
 * Singleton PrismaClient.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a new
 * PrismaClient (and a new connection pool) on every reload until the database
 * refuses further connections. Caching the instance on `globalThis` in
 * development keeps a single client alive across reloads. In production the
 * module is evaluated once per serverless instance, so no cache is needed.
 *
 * Query logging is development-only — in production it would print every SQL
 * statement into the Vercel logs.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
