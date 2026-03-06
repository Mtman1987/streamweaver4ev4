'use client';
import { useEffect, useState } from 'react';

export default function PokemonTradeOverlay() {
  const [tradeData, setTradeData] = useState<any>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      try {
        ws = new WebSocket('ws://127.0.0.1:8090');
        
        ws.onopen = () => {
          console.log('[Trade Overlay] WebSocket connected');
        };
        
        ws.onerror = (error) => {
          console.error('[Trade Overlay] WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('[Trade Overlay] WebSocket closed, reconnecting in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Trade Overlay] Received:', data.type);
            if (data.type === 'pokemon-trade-preview' || data.type === 'pokemon-trade-execute') {
              setTradeData(data);
              if (data.type === 'pokemon-trade-execute') {
                runAnimation();
              }
            }
          } catch (error) {
            console.error('[Trade Overlay] Failed to parse message:', error);
          }
        };
      } catch (error) {
        console.error('[Trade Overlay] Failed to connect:', error);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const runAnimation = () => {
    setTimeout(() => {
      document.getElementById('wrapperA')?.classList.add('slide-center-A');
      document.getElementById('wrapperB')?.classList.add('slide-center-B');
    }, 1500);

    setTimeout(() => {
      document.getElementById('innerA')?.classList.add('flipped');
      document.getElementById('innerB')?.classList.add('flipped');
    }, 4000);

    setTimeout(() => {
      document.getElementById('flash')?.classList.add('flash-active');
    }, 5500);

    setTimeout(() => {
      document.getElementById('wrapperA')?.classList.remove('slide-center-A');
      document.getElementById('wrapperA')?.classList.add('slide-back-A');
      document.getElementById('wrapperB')?.classList.remove('slide-center-B');
      document.getElementById('wrapperB')?.classList.add('slide-back-B');
    }, 6000);

    setTimeout(() => {
      document.getElementById('banner')?.classList.add('show');
    }, 7000);

    setTimeout(() => {
      document.getElementById('wrapperA')?.classList.add('grow');
      document.getElementById('wrapperB')?.classList.add('grow');
      document.getElementById('banner')?.classList.add('grow');
    }, 9000);
  };

  if (!tradeData) return null;

  const [setA, numA] = tradeData.cardA?.split('-') || ['', ''];
  const [setB, numB] = tradeData.cardB?.split('-') || ['', ''];
  const cardAUrl = `/api/pokemon-card-image?set=${setA}&number=${numA}&name=Unknown`;
  const cardBUrl = `/api/pokemon-card-image?set=${setB}&number=${numB}&name=Unknown`;

  return (
    <div style={{ margin: 0, width: '100vw', height: '100vh', background: 'transparent', overflow: 'hidden', position: 'relative' }}>
      <div className="trainer-box" id="trainerA-box">
        <img src={tradeData.avatarA} className="trainer-img" />
        <div className="username">{tradeData.userA}</div>
      </div>

      <div className="trainer-box" id="trainerB-box">
        <img src={tradeData.avatarB} className="trainer-img" />
        <div className="username">{tradeData.userB}</div>
      </div>

      <div className="card-wrapper cardA-wrapper" id="wrapperA">
        <div className="card-inner" id="innerA">
          <img className="card-front" src={cardAUrl} />
          <img className="card-back" src="/cards/database/background.jpg" />
        </div>
      </div>

      <div className="card-wrapper cardB-wrapper" id="wrapperB">
        <div className="card-inner" id="innerB">
          <img className="card-front" src={cardBUrl} />
          <img className="card-back" src="/cards/database/background.jpg" />
        </div>
      </div>

      <div id="flash" className="flash"></div>
      <div id="banner" className="banner">TRADE COMPLETE!</div>

      <style jsx global>{`
        .trainer-box { position: absolute; width: 200px; text-align: center; }
        #trainerA-box { left: 50px; top: 50px; }
        #trainerB-box { right: 50px; top: 50px; }
        .trainer-img { width: 150px; height: 150px; border-radius: 50%; }
        .username { margin-top: 10px; font-size: 24px; font-weight: bold; color: white; text-shadow: 2px 2px 4px black; }
        .card-wrapper { position: absolute; width: 200px; height: 280px; perspective: 1000px; transition: all 1s ease; }
        .cardA-wrapper { left: 100px; top: 250px; }
        .cardB-wrapper { right: 100px; top: 250px; }
        .card-inner { width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.8s; }
        .card-inner.flipped { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px; }
        .card-back { background-size: cover; }
        .card-front { transform: rotateY(180deg); }
        .slide-center-A { left: calc(50% - 250px) !important; top: calc(50% - 140px) !important; }
        .slide-center-B { right: calc(50% - 250px) !important; top: calc(50% - 140px) !important; }
        .slide-back-A { left: 100px !important; top: 250px !important; }
        .slide-back-B { right: 100px !important; top: 250px !important; }
        .flash { position: fixed; inset: 0; background: white; opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 5; }
        .flash-active { opacity: 0.8; }
        .banner { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); font-size: 72px; font-weight: bold; color: gold; text-shadow: 4px 4px 8px black; opacity: 0; transition: all 0.5s; z-index: 10; }
        .banner.show { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        .grow { transform: scale(1.5) !important; }
      `}</style>
    </div>
  );
}
