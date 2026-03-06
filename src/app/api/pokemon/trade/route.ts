import { NextRequest, NextResponse } from 'next/server';
import { tradeCards } from '@/services/pokemon-tcg';

export async function POST(req: NextRequest) {
  try {
    const { userA, userB, cardIdA, cardIdB } = await req.json();
    
    if (!userA || !userB || !cardIdA || !cardIdB) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await tradeCards(userA, userB, cardIdA, cardIdB);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Pokemon] Trade error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
