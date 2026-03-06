import { NextResponse } from 'next/server';
import { generateFlowNode } from '@/ai/flows/generate-flow-node';
import { listPlugins } from '@/plugins';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = body?.description;
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required.' },
        { status: 400 }
      );
    }

    const plugins = listPlugins().map((plugin) => plugin.id);

    const node = await generateFlowNode({
      description,
      context: {
        availablePlugins: plugins,
        defaultVoice: process.env.NEXT_DEFAULT_TTS_VOICE,
      },
    });

    return NextResponse.json(node);
  } catch (error: any) {
    console.error('[API] generate-node failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate node.' },
      { status: 500 }
    );
  }
}
