import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import { readUserConfig, writeUserConfig } from '@/lib/user-config';

const SETTINGS_FILE = resolve(process.cwd(), 'tokens', 'discord-channels.json');
const LEGACY_SETTINGS_FILE = resolve(process.cwd(), 'src', 'data', 'discord-channels.json');

export async function GET() {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    try {
      const legacyData = await readFile(LEGACY_SETTINGS_FILE, 'utf-8');
      return NextResponse.json(JSON.parse(legacyData));
    } catch {
      return NextResponse.json({
        logChannelId: '',
        aiChatChannelId: '',
        shoutoutChannelId: ''
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));

    // Keep user-config in sync for callers that read env/config directly.
    await writeUserConfig({
      NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID: settings?.logChannelId,
      NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID: settings?.aiChatChannelId,
      NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID: settings?.shoutoutChannelId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}