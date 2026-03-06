import { NextRequest, NextResponse } from 'next/server';
import { writeVault } from '@/lib/vault-store';
import { replaceAutomationVariables } from '@/lib/automation-variables-store';

type ImportPayloadV1 = {
  version?: number;
  vault?: unknown;
  variables?: unknown;
};

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as ImportPayloadV1 | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const mode = request.nextUrl.searchParams.get('mode') || 'replace';
    if (mode !== 'replace') {
      return NextResponse.json({ error: 'Only mode=replace is supported' }, { status: 400 });
    }

    const vault = body.vault;
    const variables = body.variables;

    if (vault !== undefined && !isRecord(vault)) {
      return NextResponse.json({ error: 'vault must be an object' }, { status: 400 });
    }
    if (variables !== undefined && !isRecord(variables)) {
      return NextResponse.json({ error: 'variables must be an object' }, { status: 400 });
    }

    // Replace is intentionally strict-ish: we only accept object shapes.
    if (vault !== undefined) {
      await writeVault(vault as any);
    }

    if (variables !== undefined) {
      const global = isRecord((variables as any).global) ? (variables as any).global : {};
      const users = isRecord((variables as any).users) ? (variables as any).users : {};
      await replaceAutomationVariables({ global, users });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
