'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ChatAndConquer() {
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(loadGameState, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadGameState = async () => {
    try {
      const res = await fetch('/api/chat-and-conquer');
      if (res.ok) {
        const data = await res.json();
        setGameState(data.gameState);
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = async () => {
    try {
      await fetch('/api/chat-and-conquer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      await loadGameState();
    } catch (error) {
      console.error('Failed to reset game:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>⚔️ Chat and Conquer</CardTitle>
          <CardDescription>Twitch-interactive RTS game</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Status: {gameState?.gameActive ? '🟢 Active' : '🔴 Waiting'}
              </p>
              <p className="text-sm text-muted-foreground">
                Phase: {gameState?.phase || 'join'}
              </p>
              <p className="text-sm text-muted-foreground">
                Turn: {gameState?.turnNumber || 0}
              </p>
            </div>
            <Button onClick={resetGame} variant="destructive">
              Reset Game
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Players ({gameState?.players?.length || 0})</h3>
            <div className="grid grid-cols-2 gap-4">
              {gameState?.players?.map((player: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <p className="font-bold">{player.username}</p>
                    <p className="text-sm text-muted-foreground">
                      Faction: {player.faction} {player.isCaptain && '👑'}
                    </p>
                    <p className="text-sm">
                      Units: {player.units?.length || 0} | HP: {player.hp}
                    </p>
                    <p className="text-sm">
                      Energy: {player.resources?.energy || 0} | Minerals: {player.resources?.minerals || 0}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Commands</h3>
            <div className="space-y-2 text-sm">
              <p><code>!join [faction] captain</code> - Join as captain</p>
              <p><code>!join [faction]</code> - Join as player</p>
              <p><code>!start</code> - Start game (captain only)</p>
              <p><code>!move &lt;x&gt; &lt;y&gt;</code> - Move unit</p>
              <p><code>!attack &lt;x&gt; &lt;y&gt;</code> - Attack enemy</p>
              <p><code>!stats</code> - View your stats</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Factions</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-purple-500/20 rounded">🟣 Pulsar</div>
              <div className="p-2 bg-amber-700/20 rounded">🟤 Nebula</div>
              <div className="p-2 bg-red-500/20 rounded">🔴 Starburst</div>
              <div className="p-2 bg-blue-500/20 rounded">🔵 Crystal</div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded">
            <p className="text-sm">
              <strong>For OBS:</strong> Use the original HTML files in the ChatAndConquer folder for the full game view.
              This page is for monitoring and control only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
