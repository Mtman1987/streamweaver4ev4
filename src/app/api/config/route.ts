import { NextRequest, NextResponse } from 'next/server';
import { readUserConfig, writeUserConfig } from '@/lib/user-config';

const KEY_MAPPING: Record<string, string> = {
  edenaiApiKey: 'EDENAI_API_KEY',
  geminiApiKey: 'GEMINI_API_KEY',
  openaiApiKey: 'OPENAI_API_KEY',
  inworldApiKey: 'INWORLD_API_KEY',
  discordLogChannelId: 'NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID',
  discordAiChatChannelId: 'NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID',
  discordWebhookUrl: 'DISCORD_WEBHOOK_URL',
  defaultTtsVoice: 'TTS_VOICE',
};

export async function GET() {
  try {
    const config = await readUserConfig();
    
    // Map back to camelCase for UI
    const mapped: any = {};
    for (const [uiKey, envKey] of Object.entries(KEY_MAPPING)) {
      if (config[envKey]) {
        mapped[uiKey] = config[envKey];
      }
    }
    
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    
    // Map camelCase to ENV_CASE
    const envUpdates: Record<string, string> = {};
    for (const [uiKey, value] of Object.entries(updates)) {
      const envKey = KEY_MAPPING[uiKey];
      if (envKey && value) {
        envUpdates[envKey] = value as string;
      }
    }
    
    await writeUserConfig(envUpdates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}