/**
 * src/lib/auth.ts
 *
 * NextAuth.js configuration — exported separately so it can be imported by
 * any route handler that needs `getServerSession(authOptions)` without
 * creating circular import issues.
 *
 * Auth flow:
 *  1. User submits studentId + password via the login form.
 *  2. Credentials provider `authorize()` queries prisma.user.findUnique
 *     by studentId.
 *  3. bcrypt.compare() validates the password against the stored hash.
 *  4. On success, NextAuth signs a JWT containing { id, role, studentId }.
 *  5. The JWT is stored in an HttpOnly cookie. Server components and route
 *     handlers access it via getServerSession(authOptions). Client components
 *     use useSession() from next-auth/react.
 *  6. types/next-auth.d.ts augments the Session.user type to include
 *     id, role, and studentId — TypeScript-safe across the codebase.
 *
 * Role values are plain strings: "STUDENT" | "DRIVER" (no Prisma enum).
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        studentId: { label: "Student ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.studentId || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { studentId: credentials.studentId }
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    // `user` is only present on the initial sign-in; afterwards the token is
    // reused as-is on every request.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
      }
      return token;
    },
    // Copies the JWT claims onto the session object exposed to the app.
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.studentId = token.studentId;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};
