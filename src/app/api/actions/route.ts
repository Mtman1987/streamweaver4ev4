import { NextResponse } from 'next/server';
import { getAllActions, createAction } from '@/lib/actions-store';
import type { CreateActionDTO } from '@/types/actions';

export async function GET() {
  try {
    const actions = await getAllActions();
    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateActionDTO = await request.json();
    if (!body?.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const action = await createAction({
      name: body.name,
      group: body.group,
      enabled: body.enabled,
    });
    return NextResponse.json(action);
  } catch (error) {
    console.error('Error creating action:', error);
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
  }
}