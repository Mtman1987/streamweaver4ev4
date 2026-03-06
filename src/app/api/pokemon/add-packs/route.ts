import { NextRequest, NextResponse } from 'next/server';
import { addPacksToUser } from '@/services/pokemon-tcg';

export async function POST(req: NextRequest) {
  try {
    const { username, count } = await req.json();
    
    if (!username || !count) {
      return NextResponse.json({ error: 'Username and count required' }, { status: 400 });
    }
    
    await addPacksToUser(username, count);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Pokemon] Add packs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
