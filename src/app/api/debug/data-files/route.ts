import { NextRequest, NextResponse } from 'next/server';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { ACTIONS_FILE_PATH } from '@/lib/actions-store';
import { COMMANDS_FILE_PATH } from '@/lib/commands-store';
import { getPrivateChatFilePath } from '@/lib/private-chat-store';
import { getPublicChatFilePath } from '@/lib/public-chat-store';

type FileKey = 'actions' | 'commands' | 'private-chat' | 'public-chat' | 'points' | 'point-settings' | 'channel-point-rewards';

function resolveFilePath(file: FileKey): string {
  if (file === 'actions') return ACTIONS_FILE_PATH;
  if (file === 'commands') return COMMANDS_FILE_PATH;
  if (file === 'private-chat') return getPrivateChatFilePath();
  if (file === 'public-chat') return getPublicChatFilePath();
  if (file === 'points') return getUserDataPath('points.json');
  if (file === 'point-settings') return getUserDataPath('point-settings.json');
  if (file === 'channel-point-rewards') return getUserDataPath('channel-point-rewards.json');
  throw new Error(`Unknown file: ${file}`);
}

function getUserDataPath(fileName: string): string {
  const { readUserConfigSync } = require('@/lib/user-config');
  const config = readUserConfigSync();
  const username = config.TWITCH_BROADCASTER_USERNAME || 'default';
  return require('path').resolve(process.cwd(), 'data', username, fileName);
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const file = (url.searchParams.get('file') || '').toLowerCase() as FileKey;

    if (!['actions', 'commands', 'private-chat', 'public-chat', 'points', 'point-settings', 'channel-point-rewards'].includes(file)) {
      return NextResponse.json(
        { error: 'Invalid file. Use ?file=actions, ?file=commands, ?file=private-chat, ?file=public-chat, ?file=points, ?file=point-settings, or ?file=channel-point-rewards' },
        { status: 400 }
      );
    }

    const filePath = resolveFilePath(file);
    const [stat, raw] = await Promise.all([
      fsp.stat(filePath),
      fsp.readFile(filePath, 'utf-8'),
    ]);

    // Best-effort count (don’t fail the endpoint if JSON is temporarily invalid while editing)
    let count: number | null = null;
    try {
      const parsed = JSON.parse(raw);
      count = Array.isArray(parsed) ? parsed.length : null;
    } catch {
      count = null;
    }

    return NextResponse.json({
      file,
      path: filePath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      count,
      raw,
    });
  } catch (error) {
    console.error('[debug/data-files] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}
