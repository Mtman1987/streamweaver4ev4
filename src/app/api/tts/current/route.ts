import { NextRequest, NextResponse } from 'next/server';

type TtsState = {
  audioUrl: string | null;
  updatedAt: string | null;
};

function getTtsState(): TtsState {
  const g = globalThis as any;
  if (!g.__streamweaver_tts_state) {
    g.__streamweaver_tts_state = {
      audioUrl: null,
      updatedAt: null,
    } satisfies TtsState;
  }
  return g.__streamweaver_tts_state as TtsState;
}

export async function GET() {
  const state = getTtsState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const audioUrl = typeof body?.audioUrl === 'string' ? body.audioUrl.trim() : '';

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    const state = getTtsState();
    state.audioUrl = audioUrl;
    state.updatedAt = new Date().toISOString();

    return NextResponse.json({ success: true, updatedAt: state.updatedAt });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save tts audio' }, { status: 500 });
  }
}

