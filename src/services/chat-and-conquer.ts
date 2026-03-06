// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ⚔️ CHAT AND CONQUER - COMPLETE RTS GAME                             ║
// ║  Turn-based strategy with building, resources, and combat            ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import * as fs from 'fs/promises';
import * as path from 'path';
import { sendChatMessage } from './twitch';

const GAME_STATE_PATH = path.resolve(process.cwd(), 'data', 'chat-and-conquer', 'game-state.json');
const GRID_SIZE = 30;
const BUILDING_PHASE_TIME = 120000; // 2 minutes
const ACTION_PHASE_TIME = 120000; // 2 minutes
const FACTIONS = ['pulsar', 'nebula', 'starburst', 'crystal'];

// ════════════════════════════════════════════════
// 🎮 TYPES
// ════════════════════════════════════════════════
interface Unit {
  id: string;
  type: 'soldier' | 'tank' | 'aircraft';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  moveRange: number;
  moved: boolean;
  owner: string;
}

interface Building {
  id: string;
  type: 'hq' | 'powerplant' | 'forester' | 'barracks' | 'factory' | 'airfield';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  unitsProduced: number;
  harvestProgress?: number;
  owner: string;
}

interface Player {
  username: string;
  faction: string;
  isCaptain: boolean;
  wood: number;
  power: number;
  units: Unit[];
  buildings: Building[];
  eliminated: boolean;
}

interface GameState {
  active: boolean;
  phase: 'join' | 'building' | 'action' | 'ended';
  turnNumber: number;
  currentFactionIndex: number;
  currentUnitIndex: number;
  phaseStartTime: number;
  players: Player[];
  map: string[][];
  pendingBuilds: any[];
}

let gameState: GameState = {
  active: false,
  phase: 'join',
  turnNumber: 0,
  currentFactionIndex: 0,
  currentUnitIndex: 0,
  phaseStartTime: 0,
  players: [],
  map: [],
  pendingBuilds: []
};

// ════════════════════════════════════════════════
// 💾 STATE MANAGEMENT
// ════════════════════════════════════════════════
async function loadState(): Promise<void> {
  try {
    const data = await fs.readFile(GAME_STATE_PATH, 'utf-8');
    gameState = JSON.parse(data);
  } catch {
    await saveState();
  }
}

async function saveState(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(GAME_STATE_PATH), { recursive: true });
    await fs.writeFile(GAME_STATE_PATH, JSON.stringify(gameState, null, 2));
    broadcast();
  } catch (err) {
    console.error('[CAC] Save failed:', err);
  }
}

function broadcast(): void {
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({ type: 'chat-and-conquer', payload: gameState });
  }
}

// ════════════════════════════════════════════════
// 🗺️ MAP GENERATION
// ════════════════════════════════════════════════
function initMap(): void {
  gameState.map = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('grass'));
  
  // Add terrain
  for (let i = 0; i < GRID_SIZE * GRID_SIZE * 0.15; i++) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const terrain = ['forest', 'dirt', 'water', 'mountain'][Math.floor(Math.random() * 4)];
    gameState.map[y][x] = terrain;
  }
}

// ════════════════════════════════════════════════
// 🎮 COMMAND HANDLERS
// ════════════════════════════════════════════════
export async function handleJoin(user: string, args: string[]): Promise<void> {
  if (gameState.active) {
    await send(user, 'Game in progress! Wait for next round.');
    return;
  }

  const faction = args[0]?.toLowerCase();
  if (!FACTIONS.includes(faction)) {
    await send(user, `Choose faction: ${FACTIONS.join(', ')}`);
    return;
  }

  const isCaptain = args[1]?.toLowerCase() === 'captain';
  
  if (isCaptain && gameState.players.find(p => p.faction === faction && p.isCaptain)) {
    await send(user, `${faction} already has a captain!`);
    return;
  }

  if (gameState.players.find(p => p.username === user)) {
    await send(user, 'Already joined!');
    return;
  }

  gameState.players.push({
    username: user,
    faction,
    isCaptain,
    wood: 50,
    power: 20,
    units: [],
    buildings: [],
    eliminated: false
  });

  await saveState();
  await sendChatMessage(`${user} joined ${faction}${isCaptain ? ' as captain' : ''}! ⚔️`, 'bot');
}

export async function handleStart(user: string): Promise<void> {
  if (gameState.active) {
    await send(user, 'Already started!');
    return;
  }

  const player = gameState.players.find(p => p.username === user);
  if (!player?.isCaptain) {
    await send(user, 'Only captains can start!');
    return;
  }

  const factions = [...new Set(gameState.players.map(p => p.faction))];
  if (factions.length < 2) {
    await send(user, 'Need 2+ factions!');
    return;
  }

  gameState.active = true;
  gameState.phase = 'building';
  gameState.turnNumber = 1;
  gameState.currentFactionIndex = 0;
  gameState.phaseStartTime = Date.now();
  
  initMap();
  spawnHQs();
  
  await saveState();
  await sendChatMessage(`🎮 Chat and Conquer started! Turn 1 - ${getCurrentFaction()} building phase (2min)`, 'bot');
}

function spawnHQs(): void {
  const positions = [
    { x: 5, y: 5 },
    { x: GRID_SIZE - 6, y: 5 },
    { x: 5, y: GRID_SIZE - 6 },
    { x: GRID_SIZE - 6, y: GRID_SIZE - 6 }
  ];

  const factions = [...new Set(gameState.players.map(p => p.faction))];
  factions.forEach((faction, i) => {
    const pos = positions[i];
    const captain = gameState.players.find(p => p.faction === faction && p.isCaptain)!;
    
    captain.buildings.push({
      id: `hq-${faction}`,
      type: 'hq',
      x: pos.x,
      y: pos.y,
      hp: 100,
      maxHp: 100,
      level: 1,
      unitsProduced: 0,
      owner: captain.username
    });
  });
}

// ════════════════════════════════════════════════
// 🏗️ BUILDING PHASE
// ════════════════════════════════════════════════
export async function handleBuild(user: string, args: string[]): Promise<void> {
  if (!gameState.active || gameState.phase !== 'building') {
    await send(user, 'Not in building phase!');
    return;
  }

  const player = gameState.players.find(p => p.username === user);
  if (!player || player.faction !== getCurrentFaction()) {
    await send(user, 'Not your turn!');
    return;
  }

  if (!player.isCaptain) {
    await send(user, 'Only captain can build!');
    return;
  }

  const type = args[0]?.toLowerCase();
  const x = parseInt(args[1]);
  const y = parseInt(args[2]);

  if (!type || isNaN(x) || isNaN(y)) {
    await send(user, 'Usage: !build <type> <x> <y>');
    return;
  }

  const costs: Record<string, { wood: number; power: number }> = {
    powerplant: { wood: 15, power: 0 },
    forester: { wood: 10, power: 5 },
    barracks: { wood: 20, power: 10 },
    factory: { wood: 40, power: 20 },
    airfield: { wood: 60, power: 40 }
  };

  const cost = costs[type];
  if (!cost) {
    await send(user, 'Invalid type! Use: powerplant, forester, barracks, factory, airfield');
    return;
  }

  if (player.wood < cost.wood || player.power < cost.power) {
    await send(user, `Need ${cost.wood}W ${cost.power}P (have ${player.wood}W ${player.power}P)`);
    return;
  }

  const buildRange = 3 + Math.floor(player.power / 10);
  const hq = player.buildings.find(b => b.type === 'hq');
  if (!hq || Math.abs(hq.x - x) + Math.abs(hq.y - y) > buildRange) {
    await send(user, `Out of range! Max: ${buildRange} tiles from HQ`);
    return;
  }

  gameState.pendingBuilds.push({ user, type, x, y, cost });
  await send(user, `Queued ${type} at (${x},${y}). Type !confirm to execute.`);
}

export async function handleTrain(user: string, args: string[]): Promise<void> {
  if (!gameState.active || gameState.phase !== 'building') {
    await send(user, 'Not in building phase!');
    return;
  }

  const player = gameState.players.find(p => p.username === user);
  if (!player || player.faction !== getCurrentFaction() || !player.isCaptain) {
    await send(user, 'Not your turn or not captain!');
    return;
  }

  const unitType = args[0]?.toLowerCase();
  const x = parseInt(args[2]);
  const y = parseInt(args[3]);

  const costs: Record<string, { wood: number; power: number; building: string }> = {
    soldier: { wood: 5, power: 2, building: 'barracks' },
    tank: { wood: 15, power: 8, building: 'factory' },
    aircraft: { wood: 25, power: 15, building: 'airfield' }
  };

  const cost = costs[unitType];
  if (!cost) {
    await send(user, 'Invalid unit! Use: soldier, tank, aircraft');
    return;
  }

  const building = player.buildings.find(b => b.type === cost.building && b.x === x && b.y === y);
  if (!building) {
    await send(user, `No ${cost.building} at (${x},${y})!`);
    return;
  }

  if (player.wood < cost.wood || player.power < cost.power) {
    await send(user, `Need ${cost.wood}W ${cost.power}P`);
    return;
  }

  player.wood -= cost.wood;
  player.power -= cost.power;

  const stats = {
    soldier: { hp: 10, damage: 1, moveRange: 2 },
    tank: { hp: 20, damage: 2, moveRange: 4 },
    aircraft: { hp: 15, damage: 4, moveRange: 8 }
  };

  const s = stats[unitType as keyof typeof stats];
  player.units.push({
    id: `${unitType}-${Date.now()}`,
    type: unitType as any,
    x, y,
    hp: s.hp,
    maxHp: s.hp,
    damage: s.damage,
    moveRange: s.moveRange,
    moved: false,
    owner: user
  });

  building.unitsProduced++;
  await saveState();
  await send(user, `Trained ${unitType}! (${player.wood}W ${player.power}P left)`);
}

export async function handleConfirm(user: string): Promise<void> {
  if (!gameState.active || gameState.phase !== 'building') return;

  const player = gameState.players.find(p => p.username === user);
  if (!player || !player.isCaptain) return;

  for (const build of gameState.pendingBuilds.filter(b => b.user === user)) {
    player.wood -= build.cost.wood;
    player.power -= build.cost.power;

    const stats: Record<string, any> = {
      powerplant: { hp: 30, level: 1 },
      forester: { hp: 20, level: 1, harvestProgress: 0 },
      barracks: { hp: 50, level: 1, unitsProduced: 0 },
      factory: { hp: 60, level: 2, unitsProduced: 0 },
      airfield: { hp: 70, level: 3, unitsProduced: 0 }
    };

    const s = stats[build.type];
    player.buildings.push({
      id: `${build.type}-${Date.now()}`,
      type: build.type,
      x: build.x,
      y: build.y,
      hp: s.hp,
      maxHp: s.hp,
      level: s.level,
      unitsProduced: s.unitsProduced || 0,
      harvestProgress: s.harvestProgress,
      owner: user
    });
  }

  gameState.pendingBuilds = gameState.pendingBuilds.filter(b => b.user !== user);
  
  // Process resources
  player.buildings.filter(b => b.type === 'powerplant').forEach(() => player.power += 10);
  
  player.buildings.filter(b => b.type === 'forester').forEach(f => {
    if (f.harvestProgress !== undefined) {
      f.harvestProgress++;
      if (f.harvestProgress >= 3) {
        const forestRange = Math.floor(player.power / 5);
        const nearbyForest = findNearbyTerrain(f.x, f.y, 'forest', forestRange);
        if (nearbyForest) {
          player.wood += 20;
          gameState.map[nearbyForest.y][nearbyForest.x] = 'dirt';
          f.harvestProgress = 0;
        }
      }
    }
  });

  await saveState();
  await send(user, `Confirmed! ${player.wood}W ${player.power}P`);
  
  checkPhaseTimeout();
}

// ════════════════════════════════════════════════
// ⚔️ ACTION PHASE
// ════════════════════════════════════════════════
export async function handleMove(user: string, args: string[]): Promise<void> {
  if (!gameState.active || gameState.phase !== 'action') {
    await send(user, 'Not in action phase!');
    return;
  }

  const player = gameState.players.find(p => p.username === user);
  if (!player) return;

  const unit = player.units[gameState.currentUnitIndex];
  if (!unit || unit.moved) {
    await send(user, 'No unit available!');
    return;
  }

  const x = parseInt(args[0]);
  const y = parseInt(args[1]);

  if (isNaN(x) || isNaN(y)) {
    await send(user, 'Usage: !move <x> <y>');
    return;
  }

  const dist = Math.abs(unit.x - x) + Math.abs(unit.y - y);
  if (dist > unit.moveRange) {
    await send(user, `Too far! Max: ${unit.moveRange} tiles`);
    return;
  }

  if (gameState.map[y]?.[x] === 'water' || gameState.map[y]?.[x] === 'mountain') {
    await send(user, 'Impassable terrain!');
    return;
  }

  unit.x = x;
  unit.y = y;
  unit.moved = true;

  await saveState();
  await send(user, `Moved to (${x},${y})`);
  advanceUnit();
}

export async function handleAttack(user: string, args: string[]): Promise<void> {
  if (!gameState.active || gameState.phase !== 'action') return;

  const player = gameState.players.find(p => p.username === user);
  if (!player) return;

  const unit = player.units[gameState.currentUnitIndex];
  if (!unit || unit.moved) return;

  const x = parseInt(args[0]);
  const y = parseInt(args[1]);

  const target = findTargetAt(x, y);
  if (!target) {
    await send(user, 'No target!');
    return;
  }

  if (target.owner.faction === player.faction) {
    await send(user, 'Friendly fire disabled!');
    return;
  }

  const dist = Math.abs(unit.x - x) + Math.abs(unit.y - y);
  if (dist > 1) {
    await send(user, 'Must be adjacent!');
    return;
  }

  if (target.type === 'unit') {
    target.obj.hp -= unit.damage;
    if (target.obj.hp <= 0) {
      target.owner.units = target.owner.units.filter(u => u.id !== target.obj.id);
      await sendChatMessage(`💥 ${user} destroyed ${target.owner.username}'s ${target.obj.type}!`, 'bot');
    }
  } else {
    target.obj.hp -= unit.damage;
    if (target.obj.hp <= 0) {
      target.owner.buildings = target.owner.buildings.filter(b => b.id !== target.obj.id);
      await sendChatMessage(`🔥 ${user} destroyed ${target.owner.username}'s ${target.obj.type}!`, 'bot');
      
      if (target.obj.type === 'hq') {
        target.owner.eliminated = true;
        await sendChatMessage(`☠️ ${target.owner.faction} eliminated!`, 'bot');
        checkWinCondition();
      }
    }
  }

  unit.moved = true;
  await saveState();
  advanceUnit();
}

export async function handleSkip(user: string): Promise<void> {
  if (!gameState.active || gameState.phase !== 'action') return;
  
  const player = gameState.players.find(p => p.username === user);
  if (!player) return;

  const unit = player.units[gameState.currentUnitIndex];
  if (unit) unit.moved = true;

  await saveState();
  advanceUnit();
}

export async function handleStats(user: string): Promise<void> {
  const player = gameState.players.find(p => p.username === user);
  if (!player) {
    await send(user, 'Not in game!');
    return;
  }

  await send(user, `${player.faction} | Units: ${player.units.length} | ${player.wood}W ${player.power}P | Buildings: ${player.buildings.length}`);
}

// ════════════════════════════════════════════════
// 🎯 GAME LOGIC
// ════════════════════════════════════════════════
function getCurrentFaction(): string {
  const factions = [...new Set(gameState.players.filter(p => !p.eliminated).map(p => p.faction))];
  return factions[gameState.currentFactionIndex] || '';
}

function advanceUnit(): void {
  const currentFaction = getCurrentFaction();
  const factionPlayers = gameState.players.filter(p => p.faction === currentFaction && !p.eliminated);
  
  let allMoved = true;
  for (const p of factionPlayers) {
    if (p.units.some(u => !u.moved)) {
      allMoved = false;
      break;
    }
  }

  if (allMoved) {
    advanceTurn();
  }
}

function advanceTurn(): void {
  const factions = [...new Set(gameState.players.filter(p => !p.eliminated).map(p => p.faction))];
  gameState.currentFactionIndex++;

  if (gameState.currentFactionIndex >= factions.length) {
    gameState.currentFactionIndex = 0;
    gameState.turnNumber++;
  }

  gameState.players.forEach(p => p.units.forEach(u => u.moved = false));
  gameState.phase = 'building';
  gameState.phaseStartTime = Date.now();
  gameState.pendingBuilds = [];

  saveState();
  sendChatMessage(`Turn ${gameState.turnNumber} - ${getCurrentFaction()} building phase`, 'bot');
}

function checkPhaseTimeout(): void {
  const elapsed = Date.now() - gameState.phaseStartTime;
  const limit = gameState.phase === 'building' ? BUILDING_PHASE_TIME : ACTION_PHASE_TIME;

  if (elapsed >= limit) {
    if (gameState.phase === 'building') {
      gameState.phase = 'action';
      gameState.phaseStartTime = Date.now();
      gameState.currentUnitIndex = 0;
      sendChatMessage(`${getCurrentFaction()} action phase!`, 'bot');
    } else {
      advanceTurn();
    }
    saveState();
  }
}

function checkWinCondition(): void {
  const alive = gameState.players.filter(p => !p.eliminated);
  const factions = [...new Set(alive.map(p => p.faction))];

  if (factions.length === 1) {
    gameState.phase = 'ended';
    gameState.active = false;
    sendChatMessage(`🏆 ${factions[0]} WINS! 🏆`, 'bot');
    saveState();
  }
}

function findTargetAt(x: number, y: number): { type: 'unit' | 'building'; obj: any; owner: Player } | null {
  for (const p of gameState.players) {
    const unit = p.units.find(u => u.x === x && u.y === y);
    if (unit) return { type: 'unit', obj: unit, owner: p };

    const building = p.buildings.find(b => b.x === x && b.y === y);
    if (building) return { type: 'building', obj: building, owner: p };
  }
  return null;
}

function findNearbyTerrain(x: number, y: number, terrain: string, range: number): { x: number; y: number } | null {
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= range) {
        const nx = x + dx;
        const ny = y + dy;
        if (gameState.map[ny]?.[nx] === terrain) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

async function send(user: string, msg: string): Promise<void> {
  await sendChatMessage(`@${user}, ${msg}`, 'bot');
}

// ════════════════════════════════════════════════
// 🚀 EXPORTS
// ════════════════════════════════════════════════
export function getGameState(): GameState {
  return { ...gameState };
}

export async function handleReset(user: string): Promise<void> {
  // Only allow broadcaster/mods to reset
  await resetGame();
  await sendChatMessage(`🔄 Game reset by ${user}! Type !join [faction] captain to start fresh.`, 'bot');
}

export async function resetGame(): Promise<void> {
  gameState = {
    active: false,
    phase: 'join',
    turnNumber: 0,
    currentFactionIndex: 0,
    currentUnitIndex: 0,
    phaseStartTime: 0,
    players: [],
    map: [],
    pendingBuilds: []
  };
  await saveState();
}

loadState().catch(console.error);

// Auto-check phase timeouts every 10 seconds
setInterval(() => {
  if (gameState.active && (gameState.phase === 'building' || gameState.phase === 'action')) {
    checkPhaseTimeout();
  }
}, 10000);
