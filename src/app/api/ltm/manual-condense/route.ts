import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addLTMEntry } from '@/lib/ltm-store';
import { getChannelMessages } from '@/services/discord';

export async function POST(request: NextRequest) {
  try {
    const { channelId, startIndex = 0, batchSize = 20 } = await request.json();
    
    if (!channelId) {
      return NextResponse.json({ error: 'channelId required' }, { status: 400 });
    }
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }
    
    const messages = await getChannelMessages(channelId, 100);
    const aiMessages = messages
      .filter((msg: any) => msg.content.match(/^\[(\d+|undefined)\]\[AI\]\[U1\]/))
      .map((msg: any) => {
        const match = msg.content.match(/^\[(\d+|undefined)\]\[AI\]\[U1\] (.*?): "(.*)"/);
        if (match) {
          const [, , speaker, text] = match;
          return `${speaker}: ${text}`;
        }
        return null;
      })
      .filter(Boolean)
      .reverse();
    
    const batch = aiMessages.slice(startIndex, startIndex + batchSize);
    
    if (batch.length === 0) {
      return NextResponse.json({ error: 'No messages in batch' }, { status: 404 });
    }
    
    const chatHistory = batch.join('\n');
    
    const prompt = `Analyze this AI chat conversation and create a concise memory entry.
    
Chat History:
${chatHistory}

Create a memory with:
1. A short, descriptive title (2-5 words) that captures the main topic
2. A 5-10 sentence summary of the key points, decisions, or information discussed

Format your response as:
TITLE: [your title]
CONTENT: [your summary]`;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text()?.trim();
    
    if (!responseText) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 });
    }
    
    const titleMatch = responseText.match(/TITLE:\s*(.+)/);
    const contentMatch = responseText.match(/CONTENT:\s*([\s\S]+)/);
    
    if (!titleMatch || !contentMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }
    
    const title = titleMatch[1].trim();
    const content = contentMatch[1].trim();
    
    await addLTMEntry(title, content);
    
    return NextResponse.json({ 
      title, 
      content, 
      batchProcessed: batch.length,
      nextStartIndex: startIndex + batchSize,
      totalMessages: aiMessages.length
    });
  } catch (error) {
    console.error('[Manual LTM Condense] Error:', error);
    return NextResponse.json({ error: 'Failed to condense memory' }, { status: 500 });
  }
}