import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentInteractions } from '@/lib/db/dynamo';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const interactions = await fetchRecentInteractions(userId, 20); // Get last 20 conversations
    
    // Transform to match ChatHistory component expectations
    const history = interactions.map(item => ({
      timestamp: item.timestamp,
      query: item.content,
      response: item.response,
      level: item.level,
      mode: item.mode,
    }));
    
    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('[History API] Error:', error);
    return NextResponse.json(
      { history: [], error: 'Failed to fetch history', details: error.message },
      { status: 200 } // Return 200 with empty array instead of 500
    );
  }
}
