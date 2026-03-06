import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig, updateAppConfig } from '@/lib/app-config';

export async function GET() {
  try {
    const config = await getAppConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    await updateAppConfig(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}