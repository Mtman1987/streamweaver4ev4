import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

async function rmSafe(targetPath: string): Promise<void> {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

/**
 * Development utility: clears local auth/config persisted on disk.
 *
 * This resets the app to a "new user" state by removing local token/config files.
 * It intentionally does NOT delete actions/commands stored elsewhere.
 */
export async function POST() {
  const tokensDir = path.resolve(process.cwd(), 'tokens');

  // Wipe the entire tokens directory: Twitch tokens, user-config, vault, discord channel config, etc.
  await rmSafe(tokensDir);

  return NextResponse.json({ ok: true });
}
