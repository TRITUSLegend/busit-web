import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPaymentReceipt } from '@/lib/email';

/**
 * POST /api/payment/pay
 *
 * Charges a student the flat shuttle fare. This is the endpoint the driver's
 * QR scanner calls after decoding a boarding pass.
 *
 * The fare is the module-level `FARE` constant below (20 credits) — this file
 * is the only place it is defined.
 *
 * Authentication: Requires a session with role === "DRIVER".
 *
 * Request body (JSON):
 *   studentId: string — decoded from the scanned QR code
 *
 * Responses:
 *   200 — { success: true, message: 'Payment successful' }
 *   400 — Missing studentId, card is BLOCKED, or insufficient credits
 *   401 — No session, or the caller is not a DRIVER
 *   404 — No user with that studentId
 *   500 — Internal server error (try/catch fallback)
 *
 * Side effects:
 *   One prisma.$transaction: decrements User.credits by FARE and inserts a
 *   Transaction row (type "PAYMENT", amount -FARE).
 *   Awaits sendPaymentReceipt — see the comment at the call site for why.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Unauthorized: Only drivers can process payments' }, { status: 401 });
    }

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { studentId }
    });

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (student.cardStatus !== 'ACTIVE') return NextResponse.json({ error: 'Card is blocked' }, { status: 400 });

    const FARE = 20;

    if (student.credits < FARE) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
    }

    // Process payment in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.id },
        data: { credits: { decrement: FARE } }
      }),
      prisma.transaction.create({
        data: {
          userId: student.id,
          amount: -FARE,
          type: 'PAYMENT'
        }
      })
    ]);

    // Must be awaited: on Vercel the serverless function is frozen as soon as the
    // response is sent, so an un-awaited promise here would be silently dropped.
    // sendPaymentReceipt swallows its own errors, so this never rejects.
    await sendPaymentReceipt(student.email, student.name, FARE, student.credits - FARE);

    return NextResponse.json({ success: true, message: 'Payment successful' });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
