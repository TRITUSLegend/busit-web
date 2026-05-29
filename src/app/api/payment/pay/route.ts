import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sendPaymentReceipt } from '@/lib/email';

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

    // Send email receipt asynchronously (fire and forget so it doesn't slow down the scanner)
    sendPaymentReceipt(student.email, student.name, FARE, student.credits - FARE).catch(console.error);

    return NextResponse.json({ success: true, message: 'Payment successful' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
