/**
 * GET, POST /api/auth/[...nextauth]
 *
 * NextAuth.js catch-all handler. Serves every built-in auth endpoint —
 * /api/auth/signin, /callback/credentials, /session, /csrf, /signout.
 *
 * Authentication: Public — these endpoints are how a session is established.
 *
 * The configuration itself lives in `src/lib/auth.ts` so that route handlers
 * needing `getServerSession(authOptions)` can import it without importing a
 * route module.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
