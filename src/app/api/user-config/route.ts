import { NextRequest, NextResponse } from 'next/server';
import { isUserConfigComplete, readUserConfig, writeUserConfig } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = new Set([
  // Twitch (user-specific)
  'TWITCH_BROADCASTER_USERNAME',
  'TWITCH_BROADCASTER_ID',
  'NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME',
  'NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID',

  // Discord (user-specific)
  'NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_SHARE_CHANNEL_ID',
  'NEXT_PUBLIC_DISCORD_METRICS_CHANNEL_ID',
  'DISCORD_RAID_TRAIN_CHANNEL_ID',

  // AI Configuration (user-specific)
  'AI_PROVIDER', // 'gemini' | 'edenai' | 'openai'
  'AI_MODEL',
  'AI_PERSONALITY_NAME', // replaces hardcoded 'Commander'
  'AI_BOT_NAME', // replaces hardcoded 'Athena'
  'GEMINI_API_KEY',
  'EDENAI_API_KEY',
  'OPENAI_API_KEY',

  // TTS Configuration (user-specific)
  'TTS_PROVIDER', // 'openai' | 'inworld' | 'google'
  'TTS_VOICE',
  'DISCORD_TTS_BRIDGE', // 'true' | 'false'

  // Raid train tuning (user-specific)
  'EMERGENCY_SLOTS_LOOKAHEAD_HOURS',
  'RAID_TRAIN_SLOT_COST',
  'EMERGENCY_SLOT_COST',
]);

export async function GET() {
  const config = await readUserConfig();
  const complete = await isUserConfigComplete();
  return NextResponse.json({ config, complete });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    patch[key] = value;
  }

  const config = await writeUserConfig(patch);
  const complete = Boolean(config.TWITCH_BROADCASTER_USERNAME && config.AI_PROVIDER);

  return NextResponse.json({ config, complete });
}
