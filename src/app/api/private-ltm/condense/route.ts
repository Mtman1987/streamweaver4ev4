import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Stub implementation - just return success
    return NextResponse.json({ 
      success: true, 
      title: 'Condensed Memory ' + Date.now() 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to condense LTM' }, { status: 500 });
  }
}