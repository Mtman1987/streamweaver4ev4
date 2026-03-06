import { NextRequest, NextResponse } from 'next/server';
import { getUserCollection } from '@/services/pokemon-tcg';
import { showOverlay } from '@/services/obs';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    
    const collection = await getUserCollection(username);
    const cardUrls = collection.cards.map(c => c.imagePath);
    
    if (cardUrls.length === 0) {
      return NextResponse.json({ error: 'No cards in collection' }, { status: 404 });
    }
    
    // Show OBS overlay
    await showOverlay(
      process.env.POKEMON_COLLECTION_OVERLAY_SCENE!,
      process.env.POKEMON_COLLECTION_OVERLAY_SOURCE!,
      20000 // 20 seconds
    );
    
    // Broadcast to WebSocket clients
    const broadcast = (global as any).broadcast;
    if (broadcast) {
      broadcast({
        type: 'pokemon-collection-show',
        username,
        cards: cardUrls
      });
    }
    
    return NextResponse.json({ success: true, cardCount: cardUrls.length });
  } catch (error: any) {
    console.error('[Pokemon] Collection show error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
