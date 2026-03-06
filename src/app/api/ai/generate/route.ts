import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/services/ai-provider';

type Body = {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    console.log('[ai/generate] Request:', { promptLength: prompt.length });

    const text = await generateAIResponse(prompt);
    console.log('[ai/generate] Response:', text);
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('[ai/generate] Error:', error);
    return NextResponse.json({ error: error.message || 'AI generate failed' }, { status: 500 });
  }
}
