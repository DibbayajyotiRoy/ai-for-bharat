import { NextRequest, NextResponse } from 'next/server';
import { generateAnimation } from '@/lib/ai/animation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept, operation, level } = body;

    if (!concept || !operation) {
      return NextResponse.json(
        { error: 'concept and operation are required' },
        { status: 400 }
      );
    }

    const animationData = await generateAnimation(
      concept,
      operation,
      level || 'Beginner'
    );

    return NextResponse.json({ animation: animationData });
  } catch (error: any) {
    console.error('[Animation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate animation', details: error.message },
      { status: 500 }
    );
  }
}
