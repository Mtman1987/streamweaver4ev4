import { NextRequest, NextResponse } from 'next/server';
import { generateShoutoutAI } from '@/ai/flows/shoutout-ai';

export async function POST(request: NextRequest) {
  const { username, personality } = await request.json();
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const result = await generateShoutoutAI({ username, personality });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Shoutout API error:', error);
    return NextResponse.json({ 
      shoutout: `🔥 Go check out ${username} at https://twitch.tv/${username} - they're awesome! 💜` 
    });
  }
}