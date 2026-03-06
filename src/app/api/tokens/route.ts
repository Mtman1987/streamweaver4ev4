import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens } from '@/lib/token-utils.server';

export async function GET(request: NextRequest) {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) {
      return NextResponse.json({ error: 'No tokens found' }, { status: 404 });
    }

    // Only return the tokens needed for client-side operations
    const clientTokens = {
      botToken: tokens.botToken,
      broadcasterToken: tokens.broadcasterToken,
      botUsername: tokens.botUsername,
      broadcasterUsername: tokens.broadcasterUsername,
    };

    return NextResponse.json(clientTokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}
