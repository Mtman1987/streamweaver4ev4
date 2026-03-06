import { NextRequest, NextResponse } from 'next/server';
import { openBoosterPack } from '@/services/pokemon-tcg';

export async function POST(req: NextRequest) {
  try {
    const { username, set } = await req.json();
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    
    const cards = await openBoosterPack(username, set);
    
    if (!cards) {
      return NextResponse.json({ error: 'No packs available' }, { status: 400 });
    }
    
    return NextResponse.json({ cards, set: set || 'random' });
  } catch (error: any) {
    console.error('[Pokemon] Pack open error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
