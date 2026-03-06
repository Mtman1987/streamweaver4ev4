import { NextResponse } from 'next/server';
import { createCommand, getAllCommands } from '@/lib/commands-store';

export async function GET() {
  try {
    const commands = await getAllCommands();
    return NextResponse.json(commands);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load commands.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; command?: string; group?: string; enabled?: boolean };
    const name = (body?.name ?? '').toString().trim();
    const command = (body?.command ?? '').toString().trim();
    if (!command.startsWith('!')) {
      return NextResponse.json({ error: 'Command must start with !' }, { status: 400 });
    }
    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }
    const created = await createCommand({
      name: name || command,
      command,
      group: body?.group,
      enabled: body?.enabled,
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create command.' },
      { status: 500 }
    );
  }
}