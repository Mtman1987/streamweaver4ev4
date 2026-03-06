import { NextRequest, NextResponse } from 'next/server';
import { getOverlayData } from '@/services/overlay-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const data = await getOverlayData(type);
    
    if (!data) {
      return NextResponse.json({ message: 'No data' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Overlay API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
