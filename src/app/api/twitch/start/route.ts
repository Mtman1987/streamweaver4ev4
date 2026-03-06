import { NextResponse } from 'next/server';
import { setupTwitchClient } from '@/services/twitch-client';

export async function POST() {
  try {
    console.log('[Twitch Start API] Starting Twitch client...');
    await setupTwitchClient();
    return NextResponse.json({ success: true, message: 'Twitch client started' });
  } catch (error) {
    console.error('[Twitch Start API] Failed to start client:', error);
    return NextResponse.json({ error: 'Failed to start Twitch client' }, { status: 500 });
  }
}