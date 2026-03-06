'use client';

import { useEffect, useState } from 'react';

interface Unit {
  id: string;
  type: 'soldier' | 'tank' | 'aircraft';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: string;
}

interface Building {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: string;
}

interface Player {
  username: string;
  faction: string;
  wood: number;
  power: number;
  units: Unit[];
  buildings: Building[];
  eliminated: boolean;
}

interface GameState {
  active: boolean;
  phase: string;
  turnNumber: number;
  players: Player[];
  map: string[][];
}

const FACTION_COLORS: Record<string, string> = {
  pulsar: '#9B59B6',
  nebula: '#8B4513',
  starburst: '#E74C3C',
  crystal: '#3498DB'
};

const TERRAIN_COLORS: Record<string, string> = {
  grass: '#2ECC71',
  forest: '#27AE60',
  dirt: '#A0826D',
  water: '#3498DB',
  mountain: '#7F8C8D'
};

export default function ChatAndConquerOverlay() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/chat-and-conquer');
        const data = await res.json();
        setGameState(data);
      } catch (err) {
        console.error('Failed to fetch game state:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);

    const ws = new WebSocket(`ws://${process.env.NEXT_PUBLIC_STREAMWEAVE_WS_HOST || '127.0.0.1'}:${process.env.NEXT_PUBLIC_STREAMWEAVE_WS_PORT || '8090'}`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chat-and-conquer') {
          setGameState(msg.payload);
        }
      } catch {}
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  if (!gameState || !gameState.active) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">⚔️ Chat and Conquer ⚔️</h1>
          <p className="text-2xl text-gray-300">Waiting for players...</p>
          <p className="text-xl text-gray-400 mt-4">Type !join [faction] to play!</p>
        </div>
      </div>
    );
  }

  const cellSize = Math.min(1920 / gameState.map[0].length, 1080 / gameState.map.length);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black opacity-50" />
      
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 p-4 z-20">
        <div className="flex justify-between items-center">
          <div className="text-white text-2xl font-bold">
            Turn {gameState.turnNumber} - {gameState.phase.toUpperCase()}
          </div>
          <div className="flex gap-6">
            {gameState.players.filter(p => !p.eliminated).map(p => (
              <div key={p.username} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: FACTION_COLORS[p.faction] }}
                />
                <span className="text-white font-semibold">{p.faction}</span>
                <span className="text-gray-300 text-sm">
                  {p.wood}W {p.power}P | {p.units.length}U
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pt-20">
        <div 
          className="grid gap-0 border-2 border-gray-700"
          style={{
            gridTemplateColumns: `repeat(${gameState.map[0].length}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gameState.map.length}, ${cellSize}px)`
          }}
        >
          {gameState.map.map((row, y) =>
            row.map((terrain, x) => {
              const allUnits = gameState.players.flatMap(p => p.units);
              const allBuildings = gameState.players.flatMap(p => p.buildings);
              
              const unit = allUnits.find(u => u.x === x && u.y === y);
              const building = allBuildings.find(b => b.x === x && b.y === y);
              const owner = gameState.players.find(p => 
                p.units.includes(unit!) || p.buildings.includes(building!)
              );

              return (
                <div
                  key={`${x}-${y}`}
                  className="border border-gray-800 relative"
                  style={{
                    backgroundColor: TERRAIN_COLORS[terrain] || '#2ECC71',
                    width: cellSize,
                    height: cellSize
                  }}
                >
                  {building && owner && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-4/5 h-4/5 rounded flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: FACTION_COLORS[owner.faction] }}
                      >
                        {building.type === 'hq' && '🏰'}
                        {building.type === 'powerplant' && '⚡'}
                        {building.type === 'forester' && '🌲'}
                        {building.type === 'barracks' && '🏗️'}
                        {building.type === 'factory' && '🏭'}
                        {building.type === 'airfield' && '✈️'}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(building.hp / building.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {unit && owner && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-3/5 h-3/5 rounded-full flex items-center justify-center text-white font-bold border-2 border-white"
                        style={{ backgroundColor: FACTION_COLORS[owner.faction] }}
                      >
                        {unit.type === 'soldier' && '🪖'}
                        {unit.type === 'tank' && '🚜'}
                        {unit.type === 'aircraft' && '✈️'}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-0 left-0 text-[8px] text-gray-500 opacity-50">
                    {x},{y}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-4 rounded text-white text-sm z-20">
        <div className="font-bold mb-2">Commands:</div>
        <div className="space-y-1 text-xs">
          <div>!join [faction] captain - Join as captain</div>
          <div>!start - Start game (captain)</div>
          <div>!build [type] [x] [y] - Build structure</div>
          <div>!train [unit] at [x] [y] - Train unit</div>
          <div>!confirm - Execute builds</div>
          <div>!move [x] [y] - Move unit</div>
          <div>!attack [x] [y] - Attack target</div>
          <div>!skip - Skip unit turn</div>
          <div>!stats - View your stats</div>
        </div>
      </div>
    </div>
  );
}
