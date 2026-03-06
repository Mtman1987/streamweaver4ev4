'use client';

import { useEffect, useState } from 'react';

export default function GymBattleOverlay() {
  const [battle, setBattle] = useState<any>(null);
  const [showBattle, setShowBattle] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8090');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'gym-battle-start') {
        setBattle(data.payload);
        setShowBattle(true);
      } else if (data.type === 'gym-battle-attack') {
        setBattle((prev: any) => ({ ...prev, lastAction: data.payload }));
      } else if (data.type === 'gym-battle-switch') {
        setBattle((prev: any) => ({ ...prev, lastAction: data.payload }));
      } else if (data.type === 'gym-battle-turn') {
        setBattle(data.payload);
      } else if (data.type === 'gym-battle-end') {
        setBattle(data.payload);
        setTimeout(() => setShowBattle(false), 10000);
      }
    };

    return () => ws.close();
  }, []);

  if (!showBattle || !battle) return null;

  const challenger = battle.challenger;
  const gymLeader = battle.gymLeader;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8">
      <div className="w-full max-w-6xl">
        {/* Battle Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-yellow-400 mb-2">
            🏅 GYM BATTLE
          </h1>
          {battle.badge && (
            <p className="text-2xl text-white">
              Fighting for: {battle.badge.name}
            </p>
          )}
        </div>

        {/* Battle Arena */}
        <div className="grid grid-cols-2 gap-8">
          {/* Challenger Side */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-blue-900/50 p-4 rounded-lg">
              <img
                src={challenger?.avatar}
                alt={challenger?.username}
                className="w-16 h-16 rounded-full border-4 border-blue-400"
              />
              <div>
                <h2 className="text-2xl font-bold text-blue-400">
                  {challenger?.username}
                </h2>
                <p className="text-white">Energy: {challenger?.energy}</p>
              </div>
            </div>

            {/* Active Pokemon */}
            {challenger?.cards?.[challenger.activeCardIndex] && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-lg border-4 border-blue-400">
                <img
                  src={challenger.cards[challenger.activeCardIndex].imageUrl}
                  alt={challenger.cards[challenger.activeCardIndex].name}
                  className="w-full rounded-lg mb-4"
                />
                <h3 className="text-2xl font-bold text-white mb-2">
                  {challenger.cards[challenger.activeCardIndex].name}
                </h3>
                <div className="bg-black/50 rounded p-2">
                  <div className="flex justify-between text-white mb-1">
                    <span>HP</span>
                    <span>
                      {challenger.cards[challenger.activeCardIndex].currentHp}/
                      {challenger.cards[challenger.activeCardIndex].hp}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all"
                      style={{
                        width: `${
                          (challenger.cards[challenger.activeCardIndex].currentHp /
                            parseInt(challenger.cards[challenger.activeCardIndex].hp)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bench */}
            <div className="flex gap-2">
              {challenger?.cards?.map((card: any, i: number) => (
                <div
                  key={i}
                  className={`w-20 h-28 rounded border-2 ${
                    i === challenger.activeCardIndex
                      ? 'border-yellow-400'
                      : card.currentHp > 0
                      ? 'border-gray-400'
                      : 'border-red-600 opacity-50'
                  }`}
                >
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Gym Leader Side */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-red-900/50 p-4 rounded-lg">
              <img
                src={gymLeader?.avatar}
                alt={gymLeader?.username}
                className="w-16 h-16 rounded-full border-4 border-red-400"
              />
              <div>
                <h2 className="text-2xl font-bold text-red-400">
                  {gymLeader?.username}
                </h2>
                <p className="text-white">Energy: {gymLeader?.energy}</p>
              </div>
            </div>

            {/* Active Pokemon */}
            {gymLeader?.cards?.[gymLeader.activeCardIndex] && (
              <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-lg border-4 border-red-400">
                <img
                  src={gymLeader.cards[gymLeader.activeCardIndex].imageUrl}
                  alt={gymLeader.cards[gymLeader.activeCardIndex].name}
                  className="w-full rounded-lg mb-4"
                />
                <h3 className="text-2xl font-bold text-white mb-2">
                  {gymLeader.cards[gymLeader.activeCardIndex].name}
                </h3>
                <div className="bg-black/50 rounded p-2">
                  <div className="flex justify-between text-white mb-1">
                    <span>HP</span>
                    <span>
                      {gymLeader.cards[gymLeader.activeCardIndex].currentHp}/
                      {gymLeader.cards[gymLeader.activeCardIndex].hp}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all"
                      style={{
                        width: `${
                          (gymLeader.cards[gymLeader.activeCardIndex].currentHp /
                            parseInt(gymLeader.cards[gymLeader.activeCardIndex].hp)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bench */}
            <div className="flex gap-2">
              {gymLeader?.cards?.map((card: any, i: number) => (
                <div
                  key={i}
                  className={`w-20 h-28 rounded border-2 ${
                    i === gymLeader.activeCardIndex
                      ? 'border-yellow-400'
                      : card.currentHp > 0
                      ? 'border-gray-400'
                      : 'border-red-600 opacity-50'
                  }`}
                >
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Turn Indicator */}
        {battle.currentTurn && (
          <div className="text-center mt-8">
            <p className="text-3xl font-bold text-yellow-400">
              {battle.currentTurn === 'challenger' ? challenger?.username : gymLeader?.username}'s Turn
            </p>
          </div>
        )}

        {/* Victory Screen */}
        {battle.winner && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-yellow-400 mb-4">
                🏆 VICTORY! 🏆
              </h1>
              <p className="text-4xl text-white mb-8">{battle.winner} wins!</p>
              {battle.badge && (
                <div className="flex flex-col items-center">
                  <img
                    src={battle.badge.avatar}
                    alt={battle.badge.name}
                    className="w-32 h-32 rounded-full border-8 border-yellow-400 mb-4"
                  />
                  <p className="text-3xl text-yellow-400">{battle.badge.name} Earned!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
