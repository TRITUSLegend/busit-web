import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTopUpReceipt } from '@/lib/email';

/**
 * POST /api/payment/add
 *
 * Tops up the calling student's own wallet.
 *
 * NOTE: there is no payment gateway. Credits are minted for free — this is a
 * demo-only stand-in for a Stripe/Razorpay webhook confirming a real payment.
 *
 * Authentication: Requires a session with role === "STUDENT".
 *
 * Request body (JSON):
 *   amount: number — credits to add; must be a positive integer
 *
 * Responses:
 *   200 — { success: true, message: 'Credits added successfully' }
 *   400 — Missing amount, or not a positive integer
 *   401 — No session, or the caller is not a STUDENT
 *   404 — Session user no longer exists in the database
 *   500 — Internal server error (try/catch fallback)
 *
 * Side effects:
 *   One prisma.$transaction: increments User.credits and inserts a
 *   Transaction row (type "TOP_UP", positive amount).
 *   Awaits sendTopUpReceipt — see the comment at the call site for why.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // In a real app, this would be tied to Stripe/Razorpay webhook verification
    // For this prototype, we just add the credits directly.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: amount } }
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOP_UP'
        }
      })
    ]);

    // Must be awaited: on Vercel the serverless function is frozen as soon as the
    // response is sent, so an un-awaited promise here would be silently dropped.
    // sendTopUpReceipt swallows its own errors, so this never rejects.
    await sendTopUpReceipt(user.email, user.name, amount, user.credits + amount);

    return NextResponse.json({ success: true, message: 'Credits added successfully' });
  } catch (error) {
    console.error('Top-up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
