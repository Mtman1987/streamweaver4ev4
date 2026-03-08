import { NextRequest, NextResponse } from 'next/server';
import { generateTTS } from '@/services/tts-provider';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioDataUri = await generateTTS(text, typeof voice === 'string' ? voice : undefined);
    return NextResponse.json({ audioDataUri });
  } catch (error: any) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: error.message || 'TTS failed' }, { status: 500 });
  }
}
