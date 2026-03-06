import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { resolve } from 'path';

import { getStoredTokens, storeTokens, type StoredTokens } from '@/lib/token-utils.server';

type Role = 'broadcaster' | 'bot' | 'community-bot';

function stripRole(tokens: StoredTokens, role: Role): StoredTokens {
  const next: StoredTokens = { ...tokens };

  if (role === 'broadcaster') {
    delete next.broadcasterToken;
    delete next.broadcasterRefreshToken;
    delete next.broadcasterTokenExpiry;
    delete next.broadcasterUsername;
  } else if (role === 'bot') {
    delete next.botToken;
    delete next.botRefreshToken;
    delete next.botTokenExpiry;
    delete next.botUsername;
  } else if (role === 'community-bot') {
    delete next.communityBotToken;
    delete next.communityBotRefreshToken;
    delete next.communityBotTokenExpiry;
    delete next.communityBotUsername;
  }

  next.lastUpdated = new Date().toISOString();
  return next;
}

function hasAnyTwitchTokens(tokens: StoredTokens): boolean {
  return Boolean(
    tokens.broadcasterToken ||
      tokens.broadcasterRefreshToken ||
      tokens.botToken ||
      tokens.botRefreshToken
  );
}

export async function POST(request: NextRequest) {
  let role: Role = 'broadcaster';
  try {
    const body = (await request.json().catch(() => null)) as { role?: string } | null;
    if (body?.role === 'bot') role = 'bot';
    if (body?.role === 'broadcaster') role = 'broadcaster';
    if (body?.role === 'community-bot') role = 'community-bot';
  } catch {
    // ignore
  }

  const tokens = await getStoredTokens();
  if (!tokens) {
    return NextResponse.json({ ok: true });
  }

  const updated = stripRole(tokens, role);

  if (!hasAnyTwitchTokens(updated)) {
    // If we've cleared everything, remove the file entirely.
    const tokensFile = resolve(process.cwd(), 'tokens', 'twitch-tokens.json');
    try {
      await fs.unlink(tokensFile);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  await storeTokens(updated);
  return NextResponse.json({ ok: true });
}
