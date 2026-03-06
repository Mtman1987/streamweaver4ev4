import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { channelId, username, limit = 10 } = await request.json();
    
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    const { getChannelMessages } = require('@/services/discord');
    const messages = await getChannelMessages(channelId, limit * 2); // Get more to filter
    
    // Filter messages for the specific user and format for context
    const userId = username === 'mtman1987' ? 'U1' : 'U2';
    const userMessages = messages
      .filter((msg: any) => {
        const content = msg.content || '';
        return content.includes(`[AI][${userId}]`);
      })
      .slice(0, limit)
      .reverse() // Chronological order
      .map((msg: any) => {
        const content = msg.content || '';
        // Parse: [15][AI][U1] mtman1987: "message" or [16][AI][U1] Athena: "response"
        const match = content.match(/\[(\d+)\]\[AI\]\[U\d+\] (.+?): "(.+)"/);
        if (match) {
          const [, msgNum, author, text] = match;
          return { msgNum: parseInt(msgNum), author, content: text };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({ messages: userMessages });
  } catch (error) {
    console.error('Error fetching Discord messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}