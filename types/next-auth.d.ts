/**
 * types/next-auth.d.ts
 *
 * Module augmentation for NextAuth.js.
 *
 * BUSIT stores three extra fields on the session that NextAuth does not know
 * about by default: the database `id`, the `role` ("STUDENT" | "DRIVER"), and
 * `studentId` (the login identifier, also used as the QR payload).
 *
 * Augmenting `User`, `JWT`, and `Session` here means those fields flow through
 * the whole auth chain — authorize() -> jwt callback -> session callback ->
 * useSession() / getServerSession() — without a single type assertion.
 */

import type { DefaultUser } from "next-auth";

declare module "next-auth" {
  /** Shape returned by the Credentials provider's `authorize()`. */
  interface User extends DefaultUser {
    role: string;
    studentId: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      studentId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  /** Payload carried in the signed JWT cookie. */
  interface JWT {
    id: string;
    role: string;
    studentId: string;
  }
}
