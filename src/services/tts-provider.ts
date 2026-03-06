import { readUserConfigSync } from '@/lib/user-config';

export type TTSProvider = 'openai' | 'inworld' | 'google' | 'elevenlabs';

export interface TTSConfig {
  provider: TTSProvider;
  voice: string;
  apiKey: string;
  discordBridge: boolean;
}

export const TTS_VOICES = {
  openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  inworld: ['Ashley', 'Marcus', 'Sarah', 'David'],
  google: ['en-US-Wavenet-F', 'en-US-Wavenet-M', 'en-GB-Wavenet-F', 'en-GB-Wavenet-M'],
  elevenlabs: ['Algieba', 'Rachel', 'Bella', 'Antoni', 'Josh', 'Arnold', 'Adam', 'Sam']
};

export function getTTSConfig(): TTSConfig {
  const config = readUserConfigSync();
  
  const provider = (config.TTS_PROVIDER as TTSProvider) || 'inworld';
  const voice = config.TTS_VOICE || TTS_VOICES[provider][0];
  const discordBridge = config.DISCORD_TTS_BRIDGE === 'true';
  
  let apiKey = '';
  switch (provider) {
    case 'openai':
      apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
      break;
    case 'inworld':
      apiKey = config.INWORLD_API_KEY || process.env.INWORLD_BASE64_API_KEY || process.env.INWORLD_API_KEY || '';
      break;
    case 'google':
      apiKey = config.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
      break;
    case 'elevenlabs':
      apiKey = config.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || '';
      break;
  }
  
  return { provider, voice, apiKey, discordBridge };
}

let lastTTSCall = 0;
const TTS_RATE_LIMIT = 2000; // 2 seconds between TTS calls

export async function generateTTS(text: string): Promise<string> {
  // Rate limiting to prevent 429 errors
  const now = Date.now();
  const timeSinceLastCall = now - lastTTSCall;
  if (timeSinceLastCall < TTS_RATE_LIMIT) {
    const waitTime = TTS_RATE_LIMIT - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastTTSCall = Date.now();
  
  const config = getTTSConfig();
  
  if (!config.apiKey) {
    throw new Error(`No API key configured for ${config.provider} TTS`);
  }
  
  let audioDataUri: string;
  
  switch (config.provider) {
    case 'openai':
      audioDataUri = await generateOpenAITTS(text, config);
      break;
    case 'inworld':
      audioDataUri = await generateInworldTTS(text, config);
      break;
    case 'google':
      audioDataUri = await generateGoogleTTS(text, config);
      break;
    case 'elevenlabs':
      audioDataUri = await generateElevenLabsTTS(text, config);
      break;
    default:
      throw new Error(`Unsupported TTS provider: ${config.provider}`);
  }
  
  // Send to Discord if bridge is enabled
  if (config.discordBridge) {
    try {
      await sendToDiscordBridge(audioDataUri, text, config.voice);
    } catch (error) {
      console.warn('Discord bridge failed:', error);
    }
  }
  
  return audioDataUri;
}

async function generateOpenAITTS(text: string, config: TTSConfig): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: config.voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const audioContent = Buffer.from(audioBuffer).toString('base64');
  return `data:audio/mpeg;base64,${audioContent}`;
}

async function generateInworldTTS(text: string, config: TTSConfig): Promise<string> {
  const response = await fetch('https://api.inworld.ai/tts/v1/voice', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId: config.voice,
      modelId: 'inworld-tts-1.5-max'
    }),
  });

  if (!response.ok) {
    throw new Error(`Inworld TTS failed: ${response.status}`);
  }

  const result = await response.json();
  return `data:audio/mpeg;base64,${result.audioContent}`;
}

async function generateElevenLabsTTS(text: string, config: TTSConfig): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: config.voice })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const result = await response.json();
  return result.audioDataUri;
}

async function generateGoogleTTS(text: string, config: TTSConfig): Promise<string> {
  // This would need Google Cloud TTS implementation
  throw new Error('Google TTS not implemented yet');
}

async function sendToDiscordBridge(audioDataUri: string, text: string, voice: string): Promise<void> {
  try {
    const response = await fetch('http://localhost:8090/discord-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'discord-tts',
        payload: { audioDataUri, text, voice }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Discord bridge failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Discord bridge error:', error);
    throw error;
  }
}