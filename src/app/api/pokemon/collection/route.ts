import { NextRequest, NextResponse } from 'next/server';
import { getUserCollection } from '@/services/pokemon-tcg';

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    
    const collection = await getUserCollection(username);
    return NextResponse.json(collection);
  } catch (error: any) {
    console.error('[Pokemon] Collection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
