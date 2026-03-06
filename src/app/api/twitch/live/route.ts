import { NextRequest, NextResponse } from 'next/server';
import { getStoredTokens, ensureValidToken } from '@/lib/token-utils.server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { usernames } = await request.json();
    console.log('[Twitch Live API] Received usernames:', usernames.length);
    
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Invalid usernames array' }, { status: 400 });
    }

    // Handle both string arrays and object arrays from new JSON format
    const usernameStrings = usernames.map(u => typeof u === 'string' ? u : u.username || u.name).filter(Boolean);

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Twitch credentials not configured' }, { status: 500 });
    }

    const tokens = await getStoredTokens();
    if (!tokens) {
      return NextResponse.json({ error: 'No stored tokens found' }, { status: 500 });
    }

    const accessToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', tokens);
    
    // Also refresh community bot token if it exists
    if (tokens.communityBotToken && tokens.communityBotRefreshToken) {
      try {
        await ensureValidToken(clientId, clientSecret, 'community-bot', tokens);
      } catch (error) {
        console.error('[Twitch Live API] Failed to refresh community bot token:', error);
      }
    }
    
    // Use usernames as-is (no variations needed when reading from validated JSON)
    const allUsernames = new Set(usernameStrings);
    
    console.log(`[Twitch Live API] Checking ${allUsernames.size} usernames`);
    
    // Get all users in batches of 100
    const batchSize = 100;
    const allUsers = [];
    const usernameArray = Array.from(allUsernames);
    
    for (let i = 0; i < usernameArray.length; i += batchSize) {
      const batch = usernameArray.slice(i, i + batchSize);
      const userQueryString = batch.map(u => `login=${encodeURIComponent(u)}`).join('&');
      const userUrl = `https://api.twitch.tv/helix/users?${userQueryString}`;
      
      const userResponse = await fetch(userUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.replace('oauth:', '')}`,
          'Client-ID': clientId
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        allUsers.push(...(userData.data || []));
      }
    }
    
    console.log(`[Twitch Live API] Found ${allUsers.length} valid Twitch users`);
    
    if (allUsers.length === 0) {
      return NextResponse.json({ liveUsers: [] });
    }

    // Check which users are live
    const userIds = allUsers.map(user => user.id);
    const liveStreams = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const streamQueryString = batch.map(id => `user_id=${id}`).join('&');
      const streamUrl = `https://api.twitch.tv/helix/streams?${streamQueryString}`;
      
      const streamResponse = await fetch(streamUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.replace('oauth:', '')}`,
          'Client-ID': clientId
        }
      });

      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        liveStreams.push(...(streamData.data || []));
      }
    }

    // Map back to usernames
    const liveUsers = liveStreams.map(stream => {
      const user = allUsers.find(u => u.id === stream.user_id);
      return {
        username: user?.login || stream.user_login,
        displayName: user?.display_name || stream.user_name,
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        thumbnailUrl: stream.thumbnail_url
      };
    });

    console.log(`[Twitch Live API] ${liveUsers.length} users are live`);
    return NextResponse.json({ 
      liveUsers,
      allUsers: allUsers.map(user => ({
        username: user.login,
        displayName: user.display_name,
        id: user.id,
        profile_image_url: user.profile_image_url
      }))
    });
  } catch (error) {
    console.error('[Twitch Live API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}