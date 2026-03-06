import { NextRequest, NextResponse } from 'next/server';
import { getLTMContent } from '@/lib/ltm-store';

type RequestBody = {
  title: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;
    const title = (body.title || '').trim();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      );
    }
    
    const content = await getLTMContent(title);
    
    if (content) {
      return NextResponse.json({ 
        success: true, 
        title,
        content 
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Memory not found' 
    }, { status: 404 });
  } catch (error) {
    console.error('[LTM Retrieve API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memory' },
      { status: 500 }
    );
  }
}