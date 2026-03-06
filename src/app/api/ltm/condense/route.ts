import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getChannelMessages } from '@/services/discord';
import { addLTMEntry } from '@/lib/ltm-store';

type RequestBody = {
  channelId: string;
  messageCount?: number;
};

async function condenseChatHistory(channelId: string): Promise<{ title: string; content: string } | null> {
  try {
    // Get last 50 messages from Discord
    const messages = await getChannelMessages(channelId, 50);
    
    const chatHistory = messages
      .filter(msg => msg.content.match(/^\[\d+\]\[AI\]\[U1\]/))
      .map(msg => {
        const match = msg.content.match(/^\[\d+\]\[AI\]\[U1\] (.*?): "(.*)"/);
        if (match) {
          const [, speaker, text] = match;
          return `${speaker}: ${text}`;
        }
        return null;
      })
      .filter(Boolean)
      .reverse()
      .join('\n');
    
    if (!chatHistory) return null;
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('Missing API key');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Analyze this conversation and create a Long Term Memory (LTM) entry:

${chatHistory}

Create:
1. A short title with 3-5 key words that capture the main topic/theme
2. A 5-10 sentence summary of the key points, decisions, or important information

Format your response as:
TITLE: [your title here]
CONTENT: [your 5-10 sentence summary here]`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text()?.trim();
    
    if (!response) return null;
    
    const titleMatch = response.match(/TITLE:\s*(.+)/);
    const contentMatch = response.match(/CONTENT:\s*([\s\S]+)/);
    
    if (titleMatch && contentMatch) {
      return {
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim()
      };
    }
    
    return null;
  } catch (error) {
    console.error('[LTM Condense] Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;
    const channelId = (body.channelId || '').trim();
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing channelId' },
        { status: 400 }
      );
    }
    
    const ltmEntry = await condenseChatHistory(channelId);
    
    if (ltmEntry) {
      await addLTMEntry(ltmEntry.title, ltmEntry.content);
      console.log('[LTM] Created new memory:', ltmEntry.title);
      return NextResponse.json({ 
        success: true, 
        title: ltmEntry.title,
        content: ltmEntry.content 
      });
    }
    
    return NextResponse.json({ success: false, error: 'Failed to condense history' });
  } catch (error) {
    console.error('[LTM Condense API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to condense chat history' },
      { status: 500 }
    );
  }
}