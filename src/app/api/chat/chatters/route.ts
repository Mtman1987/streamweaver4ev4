import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens, ensureValidToken } from '@/lib/token-utils.server';
import { readUserConfig } from '@/lib/user-config';
import { getTwitchUser } from '@/services/twitch';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Twitch configuration missing' }, { status: 500 });
    }

    const storedTokens = await getStoredTokens();
    if (!storedTokens) {
      return NextResponse.json({ error: 'No stored tokens found' }, { status: 500 });
    }

    // Ensure we have a valid broadcaster token
    const broadcasterToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', storedTokens);
    if (!broadcasterToken) {
      return NextResponse.json({ error: 'Broadcaster token not found' }, { status: 500 });
    }

    // Get user ID from token validation
    const validateResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `Bearer ${broadcasterToken}` },
    });
    
    if (!validateResponse.ok) {
      return NextResponse.json({ error: 'Token validation failed' }, { status: 500 });
    }
    
    const tokenData = await validateResponse.json();
    const userId = tokenData.user_id;
    
    if (!userId) {
      return NextResponse.json({ error: 'No user ID in token' }, { status: 500 });
    }

    const url = `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${userId}&moderator_id=${userId}`;

    console.log('[Chatters API] Fetching from:', url);
    console.log('[Chatters API] Using user ID:', userId);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${broadcasterToken}`,
        'Client-ID': clientId,
      },
    });

    console.log('[Chatters API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Chatters API] Twitch API error:', response.status, errorText);

      return NextResponse.json(
        {
          error: 'Twitch API request failed',
          status: response.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log('[Chatters API] Success, found', data.data?.length || 0, 'chatters');
    return NextResponse.json({ chatters: data.data || [] });

  } catch (error) {
    console.error('[Chatters API] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch chatters', details: String((error as any)?.message || error) },
      { status: 500 }
    );
  }
}