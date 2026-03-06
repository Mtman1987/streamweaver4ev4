import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = 'http://localhost:3100/auth/youtube/callback';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'YouTube credentials not configured' }, { status: 500 });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'Failed to exchange YouTube token' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    let username = 'YouTube User';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      username = userData.name || 'YouTube User';
    }

    return NextResponse.json({ 
      success: true, 
      username, 
      role: state || 'youtube-broadcaster'
    });

  } catch (error) {
    return NextResponse.json({ error: 'YouTube token exchange failed' }, { status: 500 });
  }
}