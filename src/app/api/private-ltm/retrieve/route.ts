import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    
    // Stub implementation - return fake content for now
    const content = `This is fake LTM content for "${title}". The system is working but this is just a placeholder.`;
    
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve LTM' }, { status: 500 });
  }
}