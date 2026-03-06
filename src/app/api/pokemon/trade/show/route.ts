import { NextRequest, NextResponse } from 'next/server';
import { getUserCollection, tradeCards } from '@/services/pokemon-tcg';
import { showOverlay } from '@/services/obs';

export async function POST(req: NextRequest) {
  try {
    const { userA, userB, cardIdA, cardIdB } = await req.json();
    
    if (!userA || !userB) {
      return NextResponse.json({ error: 'Both usernames required' }, { status: 400 });
    }
    
    // Get collections
    const collectionA = await getUserCollection(userA);
    const collectionB = await getUserCollection(userB);
    
    if (collectionA.cards.length === 0 || collectionB.cards.length === 0) {
      return NextResponse.json({ error: 'One or both users have no cards' }, { status: 404 });
    }
    
    // Pick random cards if not specified
    const finalCardIdA = cardIdA || collectionA.cards[Math.floor(Math.random() * collectionA.cards.length)].id;
    const finalCardIdB = cardIdB || collectionB.cards[Math.floor(Math.random() * collectionB.cards.length)].id;
    
    // Execute trade
    const result = await tradeCards(userA, userB, finalCardIdA, finalCardIdB);
    
    // Show OBS overlay
    await showOverlay(
      process.env.POKEMON_TRADE_OVERLAY_SCENE!,
      process.env.POKEMON_TRADE_OVERLAY_SOURCE!,
      15000 // 15 seconds
    );
    
    // Broadcast to WebSocket clients
    const broadcast = (global as any).broadcast;
    if (broadcast) {
      broadcast({
        type: 'pokemon-trade-show',
        userA,
        userB,
        cardA: result.cardA.imagePath,
        cardB: result.cardB.imagePath
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      cardA: result.cardA.name,
      cardB: result.cardB.name
    });
  } catch (error: any) {
    console.error('[Pokemon] Trade show error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
