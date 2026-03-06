import { NextRequest, NextResponse } from 'next/server';
import {
  deleteGlobalVariable,
  deleteUserVariable,
  listGlobalVariables,
  listUserVariables,
  replaceGlobalVariables,
  replaceUserVariables,
  setGlobalVariable,
  setUserVariable,
} from '@/lib/automation-variables-store';

type Scope = 'global' | 'user';

function getScopeFromUrl(request: NextRequest): Scope | null {
  const scope = request.nextUrl.searchParams.get('scope');
  if (scope === 'global' || scope === 'user') return scope;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const scope = getScopeFromUrl(request);
    if (!scope) {
      return NextResponse.json({ error: 'Missing or invalid scope (global|user)' }, { status: 400 });
    }

    if (scope === 'global') {
      const variables = await listGlobalVariables();
      return NextResponse.json({ scope, variables });
    }

    const user = request.nextUrl.searchParams.get('user');
    if (!user) {
      return NextResponse.json({ error: 'Missing user for scope=user' }, { status: 400 });
    }
    const variables = await listUserVariables(user);
    return NextResponse.json({ scope, user, variables });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const scope = body.scope as Scope;
    if (scope !== 'global' && scope !== 'user') {
      return NextResponse.json({ error: 'Invalid scope (global|user)' }, { status: 400 });
    }

    // Bulk replace
    if (body.variables && typeof body.variables === 'object') {
      if (scope === 'global') {
        await replaceGlobalVariables(body.variables as Record<string, unknown>);
        return NextResponse.json({ scope, variables: await listGlobalVariables() });
      }
      const user = typeof body.user === 'string' ? body.user : '';
      if (!user.trim()) {
        return NextResponse.json({ error: 'Missing user for scope=user' }, { status: 400 });
      }
      await replaceUserVariables(user, body.variables as Record<string, unknown>);
      return NextResponse.json({ scope, user, variables: await listUserVariables(user) });
    }

    // Single key set
    const key = typeof body.key === 'string' ? body.key : '';
    if (!key.trim()) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    const value = (body as any).value;

    if (scope === 'global') {
      await setGlobalVariable(key, value);
      return NextResponse.json({ scope, variables: await listGlobalVariables() });
    }

    const user = typeof body.user === 'string' ? body.user : '';
    if (!user.trim()) {
      return NextResponse.json({ error: 'Missing user for scope=user' }, { status: 400 });
    }
    await setUserVariable(user, key, value);
    return NextResponse.json({ scope, user, variables: await listUserVariables(user) });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const scope = body.scope as Scope;
    if (scope !== 'global' && scope !== 'user') {
      return NextResponse.json({ error: 'Invalid scope (global|user)' }, { status: 400 });
    }
    const key = typeof body.key === 'string' ? body.key : '';
    if (!key.trim()) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    if (scope === 'global') {
      await deleteGlobalVariable(key);
      return NextResponse.json({ scope, variables: await listGlobalVariables() });
    }

    const user = typeof body.user === 'string' ? body.user : '';
    if (!user.trim()) {
      return NextResponse.json({ error: 'Missing user for scope=user' }, { status: 400 });
    }
    await deleteUserVariable(user, key);
    return NextResponse.json({ scope, user, variables: await listUserVariables(user) });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
