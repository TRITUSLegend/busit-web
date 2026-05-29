import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (!action || !['BLOCK', 'REQUEST_NEW'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const studentId = session.user.studentId;

    let newStatus = 'ACTIVE';
    let message = 'Card is now active.';

    if (action === 'BLOCK') {
      newStatus = 'BLOCKED';
      message = 'Card has been blocked successfully.';
    }

    const updatedUser = await prisma.user.update({
      where: { studentId },
      data: { cardStatus: newStatus }
    });

    return NextResponse.json({ success: true, message, cardStatus: updatedUser.cardStatus });
  } catch (error: any) {
    console.error('User status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
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
  } catch (error: any) {
    console.error('Fetch user data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
