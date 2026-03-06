import { NextResponse } from 'next/server';
import { deleteCommand, getCommandById, updateCommand } from '@/lib/commands-store';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cmd = await getCommandById(id);
    if (!cmd) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json(cmd);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load command.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      command?: string;
      group?: string;
      enabled?: boolean;
    };

    if (body?.command != null) {
      const command = String(body.command).trim();
      if (!command.startsWith('!')) {
        return NextResponse.json({ error: 'Command must start with !' }, { status: 400 });
      }
    }

    const updated = await updateCommand(id, {
      name: body?.name != null ? String(body.name) : undefined,
      command: body?.command != null ? String(body.command) : undefined,
      group: body?.group != null ? String(body.group) : undefined,
      enabled: body?.enabled,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update command.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteCommand(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete command.' },
      { status: 500 }
    );
  }
}
