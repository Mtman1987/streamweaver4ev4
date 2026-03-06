// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  🎨 MODULAR OVERLAY MANAGER                                           ║
// ║  Clean, minimal overlays that actually work                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import * as fs from 'fs/promises';
import * as path from 'path';
import { setBrowserSource } from './obs';

const OVERLAY_DIR = path.resolve(process.cwd(), 'data', 'overlays');

interface OverlayConfig {
  scene: string;
  source: string;
  duration: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

const OVERLAYS: Record<string, OverlayConfig> = {
  gamble: {
    scene: process.env.GAMBLE_OVERLAY_SCENE || 'Alerts',
    source: process.env.GAMBLE_OVERLAY_SOURCE || 'gamble',
    duration: 5000,
    position: 'center'
  },
  'space-mountain': {
    scene: process.env.GAMBLE_OVERLAY_SCENE || 'Alerts',
    source: 'space-mountain-overlay',
    duration: 6000,
    position: 'center'
  },
  'classic-gamble': {
    scene: process.env.GAMBLE_OVERLAY_SCENE || 'Alerts',
    source: 'classic-gamble-overlay',
    duration: 5000,
    position: 'center'
  },
  notification: {
    scene: process.env.NOTIFICATION_SCENE || 'Alerts',
    source: 'notification-overlay',
    duration: 3000,
    position: 'top-right'
  }
};

export async function showOverlay(
  type: string,
  data: any
): Promise<void> {
  const config = OVERLAYS[type];
  if (!config) {
    console.warn(`[Overlay] Unknown overlay type: ${type}`);
    return;
  }

  try {
    // Write data to JSON file
    const dataPath = path.join(OVERLAY_DIR, `${type}.json`);
    await fs.mkdir(OVERLAY_DIR, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify({ ...data, timestamp: Date.now() }, null, 2));

    // Show overlay in OBS
    const url = `http://127.0.0.1:3100/overlay/${type}`;
    await setBrowserSource(config.scene, config.source, url);

    // Auto-hide after 15 seconds
    setTimeout(async () => {
      await setBrowserSource(config.scene, config.source, 'about:blank');
    }, 15000);

    console.log(`[Overlay] Showed ${type} for 15000ms`);
  } catch (error) {
    console.error(`[Overlay] Failed to show ${type}:`, error);
  }
}

export async function getOverlayData(type: string): Promise<any> {
  try {
    const dataPath = path.join(OVERLAY_DIR, `${type}.json`);
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getOverlayConfig(type: string): OverlayConfig | null {
  return OVERLAYS[type] || null;
}
