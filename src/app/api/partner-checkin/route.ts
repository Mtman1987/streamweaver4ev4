import { NextRequest, NextResponse } from 'next/server';
import { getPartnerById } from '@/services/partner-checkin';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const partner = getPartnerById(parseInt(id));
  
  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  return NextResponse.json(partner);
}
