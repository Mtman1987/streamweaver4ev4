import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeService } from '@/services/youtube';

/**
 * Initiate YouTube OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const roleParam = new URL(request.url).searchParams.get('role');
    const role = roleParam === 'youtube-bot' ? 'youtube-bot' : 'youtube-broadcaster';
    
    const youtubeService = getYouTubeService();
    const authUrl = youtubeService.getAuthUrl(role);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('YouTube auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate YouTube authentication' },
      { status: 500 }
    );
  }
}
