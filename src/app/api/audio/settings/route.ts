import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/services/storage';

const SETTINGS_FILE = 'audio-settings.json';

export async function GET() {
  try {
    const data = await readJsonFile(SETTINGS_FILE, { output: '', input: '' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Audio Settings API] GET error:', error);
    return NextResponse.json({ output: '', input: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const output = typeof body.output === 'string' ? body.output : '';
    const input = typeof body.input === 'string' ? body.input : '';
    const data = { output, input };
    await writeJsonFile(SETTINGS_FILE, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Audio Settings API] POST error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
