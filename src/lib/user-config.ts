import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

export type UserConfig = Record<string, string>;

const TOKENS_DIR = path.join(process.cwd(), 'tokens');
const USER_CONFIG_PATH = path.join(TOKENS_DIR, 'user-config.json');

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getUserConfigPath(): string {
  return USER_CONFIG_PATH;
}

export function readUserConfigSync(): Partial<UserConfig> {
  try {
    console.log('[UserConfig] Reading from:', USER_CONFIG_PATH);
    console.log('[UserConfig] process.cwd():', process.cwd());
    console.log('[UserConfig] File exists:', fs.existsSync(USER_CONFIG_PATH));
    if (!fs.existsSync(USER_CONFIG_PATH)) return {};
    const raw = fs.readFileSync(USER_CONFIG_PATH, 'utf8');
    console.log('[UserConfig] Raw content length:', raw.length);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const out: Partial<UserConfig> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const v = normalizeString(value);
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function readUserConfig(): Promise<Partial<UserConfig>> {
  try {
    const raw = await fsp.readFile(USER_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const out: Partial<UserConfig> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const v = normalizeString(value);
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeUserConfig(patch: Record<string, unknown>): Promise<Partial<UserConfig>> {
  const existing = await readUserConfig();

  const next: Partial<UserConfig> = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    const v = normalizeString(value);
    if (v) {
      next[key] = v;
    } else {
      delete next[key];
    }
  }

  await fsp.mkdir(TOKENS_DIR, { recursive: true });
  await fsp.writeFile(USER_CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export async function isUserConfigComplete(): Promise<boolean> {
  const cfg = await readUserConfig();
  return Boolean(cfg.TWITCH_BROADCASTER_USERNAME);
}

export function applyUserConfigToProcessEnvSync(): void {
  try {
    const cfg = readUserConfigSync();
    console.log('[UserConfig] Applying to process.env, keys:', Object.keys(cfg).join(', '));
    for (const [key, value] of Object.entries(cfg)) {
      if (!value) continue;
      if (process.env[key] == null || process.env[key] === '') {
        process.env[key] = value;
        console.log(`[UserConfig] Set process.env.${key}`);
      } else {
        console.log(`[UserConfig] Skipped ${key} (already set in env)`);
      }
    }
    console.log('[UserConfig] EDENAI_API_KEY in process.env:', !!process.env.EDENAI_API_KEY);
  } catch (error) {
    console.warn('Failed to apply user config:', error);
  }
}
