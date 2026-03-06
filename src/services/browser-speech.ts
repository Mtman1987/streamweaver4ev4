export interface BrowserSpeechOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

export interface SpeechResult {
  transcription: string;
  confidence: number;
  isFinal: boolean;
}

class BrowserSpeechRecognition {
  private recognition: any = null;
  private isRecognizing: boolean = false;

  constructor() {
    console.log('[BrowserSpeech] Initializing browser speech recognition');
    if (typeof window !== 'undefined') {
      console.log('[BrowserSpeech] Window is available, checking for SpeechRecognition API');
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        console.log('[BrowserSpeech] SpeechRecognition API found, creating instance');
        this.recognition = new SpeechRecognition();
      } else {
        console.error('[BrowserSpeech] SpeechRecognition API not available in this browser');
      }
    } else {
      console.log('[BrowserSpeech] Window not available (server-side)');
    }
  }

  isAvailable(): boolean {
    const available = this.recognition !== null;
    console.log('[BrowserSpeech] isAvailable():', available);
    return available;
  }

  async startRecognition(options: BrowserSpeechOptions = {}): Promise<SpeechResult[]> {
    console.log('[BrowserSpeech] startRecognition() called with options:', options);
    
    if (!this.recognition) {
      console.error('[BrowserSpeech] Recognition not available, throwing error');
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isRecognizing) {
      console.log('[BrowserSpeech] Already recognizing, ignoring start request');
      throw new Error('Speech recognition already in progress');
    }

    console.log('[BrowserSpeech] Starting speech recognition...');
    
    return new Promise((resolve, reject) => {
      const results: SpeechResult[] = [];

      this.recognition.continuous = options.continuous ?? false;
      this.recognition.interimResults = options.interimResults ?? true;
      this.recognition.lang = options.language ?? 'en-US';
      
      console.log('[BrowserSpeech] Recognition settings:', {
        continuous: this.recognition.continuous,
        interimResults: this.recognition.interimResults,
        lang: this.recognition.lang
      });

      this.recognition.onstart = () => {
        console.log('[BrowserSpeech] Recognition started');
        this.isRecognizing = true;
      };

      this.recognition.onresult = (event: any) => {
        console.log('[BrowserSpeech] Recognition result event:', event);
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const speechResult = {
            transcription: result[0].transcript,
            confidence: result[0].confidence,
            isFinal: result.isFinal
          };
          console.log('[BrowserSpeech] Result:', speechResult);
          results.push(speechResult);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isRecognizing = false;
        if (event.error === 'network' || event.error === 'aborted') {
          resolve([]);
          return;
        }
        if (event.error === 'no-speech') {
          reject(new Error('No speech detected'));
          return;
        }
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
        resolve(results);
      };

      try {
        this.recognition.start();
        console.log('[BrowserSpeech] Recognition.start() called successfully');
      } catch (error) {
        console.error('[BrowserSpeech] Error calling recognition.start():', error);
        reject(error);
      }
    });
  }
}

export const browserSpeechRecognition = new BrowserSpeechRecognition();