'use client';

import { useEffect, useRef } from 'react';

export default function TTSPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastUrlRef = useRef<string>('');

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const response = await fetch('/api/tts/current');
        if (response.ok) {
          const data = await response.json();
          if (data.audioUrl && data.audioUrl !== lastUrlRef.current) {
            console.log('[TTS Player] New audio URL received:', data.audioUrl.substring(0, 50) + '...');
            lastUrlRef.current = data.audioUrl;
            if (audioRef.current) {
              audioRef.current.src = data.audioUrl;
              audioRef.current.volume = 1.0;
              audioRef.current.play()
                .then(() => console.log('[TTS Player] Audio playing successfully'))
                .catch(err => console.error('[TTS Player] Play failed:', err));
            }
          }
        }
      } catch (err) {
        console.error('[TTS Player] Check failed:', err);
      }
    };

    const interval = setInterval(checkForUpdate, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: 'transparent' }}>
      <audio ref={audioRef} />
    </div>
  );
}
