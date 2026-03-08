import { NextRequest, NextResponse } from 'next/server';
import { writeUserConfig } from '@/lib/user-config';

export async function POST(request: NextRequest) {
  try {
    const { personality, voice, name } = await request.json();
    const updates: Record<string, string> = {};
    
    if (personality) {
      (global as any).botPersonality = personality;
      console.log('[API] Updated bot personality');
    }
    
    if (voice) {
      (global as any).botVoice = voice;
      updates.TTS_VOICE = voice;
      console.log(`[API] Updated bot voice to: ${voice}`);
    }
    
    if (name) {
      (global as any).botName = name;
      updates.AI_BOT_NAME = name;
      console.log(`[API] Updated bot name to: ${name}`);
    }
    
    // Save to user-config.json
    if (Object.keys(updates).length > 0) {
      await writeUserConfig(updates);
      console.log('[API] Saved to user-config.json:', updates);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating bot settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}