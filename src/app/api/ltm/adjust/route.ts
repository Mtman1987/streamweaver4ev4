import { NextRequest, NextResponse } from 'next/server';
import { adjustMessageCount } from '@/lib/ltm-store';

export async function POST(request: NextRequest) {
  try {
    const { adjustment } = await request.json();
    
    if (typeof adjustment !== 'number') {
      return NextResponse.json({ error: 'adjustment must be a number' }, { status: 400 });
    }
    
    const newCount = await adjustMessageCount(adjustment);
    return NextResponse.json({ messageCount: newCount });
  } catch (error) {
    console.error('[LTM Adjust] Error:', error);
    return NextResponse.json({ error: 'Failed to adjust message count' }, { status: 500 });
  }
}