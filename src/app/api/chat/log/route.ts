import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordMessage } from '@/services/discord';
import { readUserConfig } from '@/lib/user-config';

export async function POST(request: NextRequest) {
  try {
    const userConfig = await readUserConfig();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.BOT_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      username, 
      message, 
      timestamp, 
      platform, 
      userId, 
      badges, 
      color 
    } = await request.json();
    
    if (!username || !message) {
      return NextResponse.json({ error: 'Username and message are required' }, { status: 400 });
    }

    // Log to Discord
    const discordChannelId =
      userConfig.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID ||
      process.env.NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID;
    if (!discordChannelId) {
      return NextResponse.json({ error: 'Discord log channel not configured' }, { status: 500 });
    }

    try {
      const discordMessage = `[${(platform || 'twitch').charAt(0).toUpperCase() + (platform || 'twitch').slice(1)}] ${username}: ${message}`;
      await sendDiscordMessage(discordChannelId, discordMessage);
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to log to Discord:', error);
      return NextResponse.json({ error: 'Failed to log message' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error logging chat message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}