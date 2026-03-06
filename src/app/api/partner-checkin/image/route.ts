import { NextRequest, NextResponse } from 'next/server';
import { getPartnerById } from '@/services/partner-checkin';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const partner = getPartnerById(parseInt(id));
  
  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  try {
    const imageBuffer = fs.readFileSync(partner.imagePath);
    const ext = partner.imagePath.split('.').pop()?.toLowerCase();
    const contentType = ext === 'gif' ? 'image/gif' : 'image/png';
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('[Partner Checkin] Image error:', error);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
