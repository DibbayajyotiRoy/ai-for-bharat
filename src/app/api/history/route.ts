import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentInteractions } from '@/lib/db/dynamo';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const history = await fetchRecentInteractions(userId, 20); // Get last 20 conversations
    
    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('[History API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    );
  }
}
