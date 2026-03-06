import { NextRequest, NextResponse } from 'next/server';
import { getPointSettings, updatePointSettings, getChannelPointRewards, updateChannelPointRewards } from '@/services/points';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  try {
    if (type === 'rewards') {
      const rewards = await getChannelPointRewards();
      return NextResponse.json({ rewards });
    }
    
    const settings = await getPointSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Point settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;
    
    if (type === 'rewards') {
      await updateChannelPointRewards(data.rewards);
      const updated = await getChannelPointRewards();
      return NextResponse.json({ rewards: updated });
    }
    
    await updatePointSettings(data);
    const updated = await getPointSettings();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Point settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}