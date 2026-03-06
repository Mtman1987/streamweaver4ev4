import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { channelId, embed } = await request.json();

    if (!channelId || !embed) {
      return NextResponse.json(
        { error: 'Channel ID and embed data are required' },
        { status: 400 }
      );
    }

    // Send embed message
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error posting Discord embed:', error);
    return NextResponse.json(
      { error: 'Failed to post embed' },
      { status: 500 }
    );
  }
}