import { NextRequest, NextResponse } from 'next/server';
import { getMultiPlatformManager } from '@/services/multi-platform';

/**
 * Connect to Kick or TikTok via username
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const multiPlatform = getMultiPlatformManager();
    const platform = params.platform;

    if (platform === 'kick') {
      await multiPlatform.connectKick(username);
      return NextResponse.json({ success: true, platform: 'kick' });
    } 
    else if (platform === 'tiktok') {
      await multiPlatform.connectTikTok(username);
      return NextResponse.json({ success: true, platform: 'tiktok' });
    }
    else {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error(`Platform connection error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect' },
      { status: 500 }
    );
  }
}

/**
 * Disconnect from platform
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const multiPlatform = getMultiPlatformManager();
    const platform = params.platform as 'youtube' | 'kick' | 'tiktok';

    multiPlatform.disconnect(platform);

    return NextResponse.json({ success: true, platform });

  } catch (error: any) {
    console.error(`Platform disconnection error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
