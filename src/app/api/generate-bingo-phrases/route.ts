import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { streamerName } = await req.json();
    
    // Use fallback phrases for now (AI generation can be added later)
    const fallbackPhrases = [
      'GG', 'Hype!', 'F in chat', 'Poggers', 'LUL',
      'First death', 'Epic win', 'Streamer laughs', 'Drinks water', 'Pet appears',
      'Raid incoming', 'New sub', 'FREE SPACE', 'Donation alert', 'New follower',
      'Lag spike', 'Chat spams emotes', 'Tells a story', 'Sings along', 'Dance break',
      'Game crashes', 'Viewer count doubles', 'Emote only mode', 'Inside joke', 'Gets emotional'
    ];
    
    return NextResponse.json({ phrases: fallbackPhrases });
  } catch (error) {
    console.error('[Bingo API] Error:', error);
    
    const fallbackPhrases = [
      'GG', 'Hype!', 'F in chat', 'Poggers', 'LUL',
      'First death', 'Epic win', 'Streamer laughs', 'Drinks water', 'Pet appears',
      'Raid incoming', 'New sub', 'FREE SPACE', 'Donation alert', 'New follower',
      'Lag spike', 'Chat spams emotes', 'Tells a story', 'Sings along', 'Dance break',
      'Game crashes', 'Viewer count doubles', 'Emote only mode', 'Inside joke', 'Gets emotional'
    ];
    
    return NextResponse.json({ phrases: fallbackPhrases });
  }
}
