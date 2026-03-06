import { NextRequest, NextResponse } from 'next/server';
import { getTwitchUser } from '@/services/twitch';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const login = searchParams.get('login');
    const id = searchParams.get('id');

    if (!login && !id) {
      return NextResponse.json({ error: 'Either login or id parameter is required' }, { status: 400 });
    }

    const user = await getTwitchUser(login || id!, login ? 'login' : 'id');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error in Twitch user API:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}