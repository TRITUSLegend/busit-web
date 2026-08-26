import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTopUpReceipt } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
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
          amount: amount,
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
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
