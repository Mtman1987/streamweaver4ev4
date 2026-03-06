import { NextResponse } from 'next/server';
import { getNextMessageNumber } from '@/lib/message-counter';

export async function POST(request: Request) {
  try {
    let channelId = 'default';
    
    // Try to get channelId from request body, but don't require it
    try {
      const body = await request.json();
      if (body?.channelId) {
        channelId = body.channelId;
      }
    } catch {
      // If no JSON body or parsing fails, use default
    }
    
    const result = await getNextMessageNumber(channelId);
    console.log(`[Counter API] Generated message number: ${result.number}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting next message number:', error);
    return NextResponse.json({ error: 'Failed to get message number' }, { status: 500 });
  }
}