import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, getAIConfig } from '@/services/ai-provider';
import { appendPublicChatMessages, readPublicChatMessages } from '@/lib/public-chat-store';

type RequestBody = {
  username: string;
  message: string;
  personality?: string;
};

type AIChatMessage = {
  type: 'user' | 'ai';
  username: string;
  message: string;
  timestamp: string;
};

function formatHistory(messages: AIChatMessage[]): string {
  if (messages.length === 0) return '';

  const lines = messages.map((m) => {
    const role = m.type === 'ai' ? getAIConfig().botName : m.username || 'User';
    return `${role}: ${m.message}`;
  });

  return `Conversation so far:\n${lines.join('\n')}`;
}

export async function POST(request: NextRequest) {
  console.log('[AI Chat Memory] POST request received');
  
  try {
    const body = (await request.json()) as Partial<RequestBody>;
    console.log('[AI Chat Memory] Request body:', { username: body.username, messageLength: body.message?.length });

    const username = (body.username || '').trim();
    const message = (body.message || '').trim();
    const personality = body.personality;
    const historyLimit = 50;

    if (!username || !message) {
      console.log('[AI Chat Memory] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: username, message' },
        { status: 400 }
      );
    }

    const aiConfig = getAIConfig();
    const history = await readPublicChatMessages(historyLimit);

    const systemPrompt = personality
      ? `${personality}\n\nCRITICAL RULES - YOU MUST FOLLOW THESE:\n- NEVER prefix your response with "${aiConfig.botName}:" or your name\n- Respond directly without any labels\n- The streamer's username is "${username}" - they are your ${aiConfig.personalityName}\n- Address the streamer as "${aiConfig.personalityName}"\n- Address everyone else in chat as "Captain"\n- MAXIMUM 400 characters per response - this is STRICT\n- Be concise, punchy, and engaging - no long explanations\n- If topic needs more detail, end with "Want more tips?" or similar`
      : `You are ${aiConfig.botName}, a helpful AI assistant. Never prefix responses with your name. STRICT 400 character limit - be concise.`;

    const historyText = formatHistory(history);

    let userMessage = message;
    if (historyText) {
      userMessage = `${historyText}\n\nLatest message from ${username} (your ${aiConfig.personalityName}): ${message}\n\nRespond directly without any prefix:`;
    } else {
      userMessage = `Message from ${username} (your ${aiConfig.personalityName}): ${message}\n\nRespond directly without any prefix:`;
    }

    const responseText = await generateAIResponse(userMessage, systemPrompt);

    if (!responseText) {
      console.log('[AI Chat Memory] AI returned empty response');
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 502 }
      );
    }

    // Remove bot name prefix if present
    const cleanResponse = responseText.replace(new RegExp(`^(${aiConfig.botName}|${aiConfig.botName.toLowerCase()}):\\s*`, 'i'), '').trim();

    // Save both messages to public chat file
    const timestamp = new Date().toISOString();
    await appendPublicChatMessages([
      {
        type: 'user',
        username,
        message,
        timestamp
      },
      {
        type: 'ai',
        username: aiConfig.botName,
        message: cleanResponse,
        timestamp
      }
    ]);

    console.log('[AI Chat Memory] Successfully saved messages to public chat file');
    return NextResponse.json({ response: cleanResponse });
  } catch (error) {
    console.error('[AI Chat Memory] API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response with memory' },
      { status: 500 }
    );
  }
}