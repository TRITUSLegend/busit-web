import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendUnblockOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, otp } = await req.json();

    if (!action || !['BLOCK', 'REQUEST_OTP', 'VERIFY_UNBLOCK'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const studentId = session.user.studentId;

    if (action === 'BLOCK') {
      const updatedUser = await prisma.user.update({
        where: { studentId },
        data: { cardStatus: 'BLOCKED' }
      });
      return NextResponse.json({ success: true, message: 'Card has been blocked successfully.', cardStatus: updatedUser.cardStatus });
    }

    if (action === 'REQUEST_OTP') {
      const user = await prisma.user.findUnique({ where: { studentId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (user.cardStatus === 'ACTIVE') return NextResponse.json({ error: 'Card is already active' }, { status: 400 });

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      await prisma.user.update({
        where: { studentId },
        data: {
          unblockOtp: generatedOtp,
          unblockOtpExpiry: expiry
        }
      });

      await sendUnblockOtpEmail(user.email, user.name, generatedOtp);
      return NextResponse.json({ success: true, message: 'OTP sent to your email.' });
    }

    if (action === 'VERIFY_UNBLOCK') {
      if (!otp) return NextResponse.json({ error: 'OTP is required' }, { status: 400 });

      const user = await prisma.user.findUnique({ where: { studentId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      
      if (!user.unblockOtp || !user.unblockOtpExpiry || user.unblockOtp !== otp) {
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
      }

      if (new Date() > user.unblockOtpExpiry) {
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { studentId },
        data: {
          cardStatus: 'ACTIVE',
          unblockOtp: null,
          unblockOtpExpiry: null
        }
      });

      return NextResponse.json({ success: true, message: 'Card is now active.', cardStatus: updatedUser.cardStatus });
    }

    return NextResponse.json({ error: 'Action not handled' }, { status: 500 });
  } catch (error) {
    console.error('User status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = session.user.studentId;
    const user = await prisma.user.findUnique({
      where: { studentId },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        studentId: user.studentId,
        credits: user.credits,
        cardStatus: user.cardStatus,
        transactions: user.transactions
      }
    });
  } catch (error) {
    console.error('Fetch user data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
