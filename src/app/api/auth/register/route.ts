import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/register
 *
 * Creates a new account. The same endpoint serves both roles — the client sends
 * `role: "DRIVER"` when the driver tab is selected on the register page.
 *
 * Authentication: Public — no session required.
 *
 * Request body (JSON):
 *   studentId: string — login identifier; also the QR payload for students
 *   name:      string — display name
 *   email:     string — used for receipts and the unblock OTP
 *   password:  string — plaintext; hashed with bcrypt before it is stored
 *   role?:     string — "STUDENT" | "DRIVER"; defaults to "STUDENT"
 *
 * Responses:
 *   200 — { success: true, user: { id, name } }
 *   400 — Missing required fields, invalid role, or studentId/email already taken
 *   500 — Internal server error (try/catch fallback)
 *
 * Side effects:
 *   Writes one User row. No email is sent and the account is not verified.
 */
export async function POST(req: Request) {
  try {
    const { studentId, name, email, password, role } = await req.json();

    if (!studentId || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // `role` is a plain string column with no DB-level constraint, so an
    // unrecognised value would persist and match neither privilege check.
    if (role !== undefined && role !== 'STUDENT' && role !== 'DRIVER') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId },
          { email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        studentId,
        name,
        email,
        password: hashedPassword,
        role: role || 'STUDENT',
      }
    });

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
