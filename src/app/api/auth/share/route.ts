import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens } from '@/lib/token-utils.server';

export async function GET(request: NextRequest) {
  try {
    // Verify request is from localhost (security check)
    const origin = request.headers.get('origin');
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokens = await getStoredTokens();
    if (!tokens) {
      return NextResponse.json({ error: 'No tokens available' }, { status: 404 });
    }

    // Return only necessary auth data
    return NextResponse.json({
      twitch: {
        broadcasterToken: tokens.broadcasterToken,
        broadcasterUsername: tokens.broadcasterUsername,
        botToken: tokens.botToken,
        botUsername: tokens.botUsername
      },
      discord: {
        botToken: process.env.DISCORD_BOT_TOKEN
      }
    });
  } catch (error) {
    console.error('[Auth Share] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}