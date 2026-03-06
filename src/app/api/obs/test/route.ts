import { NextRequest, NextResponse } from 'next/server';
import OBSWebSocket from 'obs-websocket-js';
import { updateVault } from '@/lib/vault-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const ip = typeof body?.ip === 'string' ? body.ip.trim() : '';
    const port = Number(body?.port);
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!ip) return NextResponse.json({ error: 'Missing ip' }, { status: 400 });
    if (!Number.isFinite(port) || port <= 0) return NextResponse.json({ error: 'Invalid port' }, { status: 400 });

    const url = `ws://${ip}:${port}`;

    const client = new OBSWebSocket();
    try {
      const pass = password.trim();
      if (pass.length > 0) {
        await (client as any).connect(url, pass);
      } else {
        await (client as any).connect(url);
      }

      // Save to Vault on success (non-sensitive config).
      await updateVault({ obs: { ip, port, password: pass.length > 0 ? pass : '' } });

      try {
        await (client as any).disconnect?.();
      } catch {
        // ignore
      }

      return NextResponse.json({ success: true, url });
    } finally {
      try {
        await (client as any).disconnect?.();
      } catch {
        // ignore
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
