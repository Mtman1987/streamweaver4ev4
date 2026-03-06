import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { personality, voice, name } = await request.json();
    
    if (personality) {
      (global as any).botPersonality = personality;
      console.log('[API] Updated bot personality');
    }
    
    if (voice) {
      (global as any).botVoice = voice;
      console.log(`[API] Updated bot voice to: ${voice}`);
    }
    
    if (name) {
      (global as any).botName = name;
      console.log(`[API] Updated bot name to: ${name}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating bot settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}