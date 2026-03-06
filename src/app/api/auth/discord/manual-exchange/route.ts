import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = 'http://localhost:3100/auth/discord/callback';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Discord credentials not configured' }, { status: 500 });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
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
      return NextResponse.json({ error: 'Failed to exchange Discord token' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    let username = 'Discord User';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      username = userData.username || 'Discord User';
    }

    return NextResponse.json({ 
      success: true, 
      username, 
      role: state || 'discord-user'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Discord token exchange failed' }, { status: 500 });
  }
}