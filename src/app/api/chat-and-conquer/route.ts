import { NextRequest, NextResponse } from 'next/server';
import { getGameState, resetGame } from '@/services/chat-and-conquer';

export async function GET(req: NextRequest) {
  try {
    const state = getGameState();
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    if (action === 'reset') {
      await resetGame();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
