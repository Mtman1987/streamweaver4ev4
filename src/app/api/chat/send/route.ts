import { NextResponse } from 'next/server';
import { setupTwitchClient, getTwitchClient } from '@/services/twitch-client';

export async function POST(request: Request) {
  try {
    const { message, as = 'broadcaster' } = await request.json();

    if (!message || (as !== 'bot' && as !== 'broadcaster')) {
      return NextResponse.json({ error: 'Invalid message or sender' }, { status: 400 });
    }

    console.log('[Chat Send API] Sending message as:', as);
    let client = getTwitchClient(as);
    console.log('[Chat Send API] Client exists:', !!client, 'Ready state:', client?.readyState());

    // Auto-reconnect if client not available
    if (!client || client.readyState() !== 'OPEN') {
      console.log('[Chat Send API] Client not ready, attempting to reconnect...');
      await setupTwitchClient();
      
      // Wait for connection and retry message
      await new Promise(resolve => setTimeout(resolve, 2000));
      client = getTwitchClient(as);
      
      if (!client || client.readyState() !== 'OPEN') {
        console.error('[Chat Send API] Client still not available after reconnect');
        return NextResponse.json({ error: 'Twitch client is not connected' }, { status: 503 });
      }
      
      // Send message after successful reconnection
      const channels = client.getChannels();
      if (channels && channels.length > 0) {
        await client.say(channels[0], message);
        return NextResponse.json({ success: true, message: 'Message sent after reconnection' });
      }
    }

    const channels = client.getChannels();
    console.log('[Chat Send API] Channels:', channels);
    if (!channels || channels.length === 0) {
      return NextResponse.json({ error: 'Not joined to any Twitch channel' }, { status: 503 });
    }

    // Send message to the first channel joined
    console.log('[Chat Send API] Sending message to channel:', channels[0]);
    await client.say(channels[0], message);
    console.log('[Chat Send API] Message sent successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/chat/send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}