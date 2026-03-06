import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens, ensureValidToken } from '@/lib/token-utils.server';

export async function POST(req: NextRequest) {
    try {
        const clientId = process.env.TWITCH_CLIENT_ID;
        const clientSecret = process.env.TWITCH_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: 'Twitch credentials not configured' }, { status: 500 });
        }

        const tokens = await getStoredTokens();
        if (!tokens) {
            return NextResponse.json({ error: 'No Twitch tokens available' }, { status: 401 });
        }

        const broadcasterToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', tokens);
        
        // Get broadcaster ID
        const userResponse = await fetch(`https://api.twitch.tv/helix/users`, {
            headers: {
                'Authorization': `Bearer ${broadcasterToken}`,
                'Client-ID': clientId,
            },
        });

        if (!userResponse.ok) {
            return NextResponse.json({ error: 'Failed to get broadcaster info' }, { status: 500 });
        }

        const userData = await userResponse.json();
        const broadcasterId = userData.data[0]?.id;

        if (!broadcasterId) {
            return NextResponse.json({ error: 'Broadcaster ID not found' }, { status: 500 });
        }

        // Create clip (has_delay=false means clip the last 60 seconds instead of 30)
        const clipResponse = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&has_delay=false`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${broadcasterToken}`,
                'Client-ID': clientId,
            },
        });

        if (!clipResponse.ok) {
            const errorData = await clipResponse.json();
            console.error('Failed to create clip:', errorData);
            return NextResponse.json({ error: 'Failed to create clip', details: errorData }, { status: clipResponse.status });
        }

        const clipData = await clipResponse.json();
        console.log('[Twitch] Clip created:', clipData);

        return NextResponse.json({ 
            success: true, 
            clip: clipData.data[0] 
        });

    } catch (error: any) {
        console.error('[Twitch] Error creating clip:', error);
        return NextResponse.json({ error: error.message || 'Failed to create clip' }, { status: 500 });
    }
}
