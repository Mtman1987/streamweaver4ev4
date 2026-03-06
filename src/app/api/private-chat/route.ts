import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { resolve } from 'path';

const PRIVATE_CHAT_FILE = resolve(process.cwd(), 'src', 'data', 'private-chat.json');

interface ChatMessage {
  type: 'user' | 'ai';
  username: string;
  message: string;
  timestamp: string;
}

export async function GET() {
  try {
    let messages: ChatMessage[] = [];
    try {
      const data = await fs.readFile(PRIVATE_CHAT_FILE, 'utf-8');
      messages = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, return empty array
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Private chat GET API error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, username, message, timestamp }: ChatMessage = await request.json();

    if (!type || !username || !message || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load existing messages
    let messages: ChatMessage[] = [];
    try {
      const data = await fs.readFile(PRIVATE_CHAT_FILE, 'utf-8');
      messages = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Add new message
    messages.push({ type, username, message, timestamp });

    // Keep only last 100 messages
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    // Save back to file
    await fs.writeFile(PRIVATE_CHAT_FILE, JSON.stringify(messages, null, 2));

    console.log(`[Private Chat] Saved ${type} message from ${username}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Private chat API error:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}