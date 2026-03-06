import fs from 'fs';
import path from 'path';
import { getPoints as getPointsData, addPoints as addPointsData } from './points';

const STATS_FILE = path.join(process.cwd(), 'data', 'user-stats.json');
const MASTER_STATS_FILE = path.join(process.cwd(), 'MasterStats', 'allUsers.json');

export interface UserStats {
  user: string;
  points: number;
  watchtime: number;
  deaths: number;
  joinDate: string;
  visits: number;
  lastSeen: string;
  totalCards: number;
  rareCards: number;
  badges: string[];
  cardCollection: string[];
}

let statsCache: Record<string, UserStats> = {};
let lastSave = 0;

function loadStats(): Record<string, UserStats> {
  if (!fs.existsSync(STATS_FILE)) {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
    fs.writeFileSync(STATS_FILE, '{}');
    return {};
  }
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
}

async function saveStats() {
  const now = Date.now();
  if (now - lastSave < 1000) {
    console.log('[UserStats] Skipping save - too soon since last save');
    return;
  }
  
  console.log(`[UserStats] Saving ${Object.keys(statsCache).length} users to disk...`);
  
  // Sync points from points.json to user stats
  for (const username of Object.keys(statsCache)) {
    const pointsData = await getPointsData(username);
    statsCache[username].points = pointsData.points;
  }
  
  fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2));
  console.log('[UserStats] Saved to disk successfully');
  
  // Sync to MasterStats/allUsers.json
  try {
    const masterData: any = {};
    for (const [username, user] of Object.entries(statsCache)) {
      masterData[username] = {
        User: user.user,
        Points: user.points,
        Watchtime: user.watchtime,
        Deaths: user.deaths,
        JoinDate: user.joinDate,
        Visits: user.visits,
        LastSeen: user.lastSeen,
        TotalCards: user.totalCards,
        RareCards: user.rareCards,
        Badges: user.badges
      };
    }
    fs.mkdirSync(path.dirname(MASTER_STATS_FILE), { recursive: true });
    fs.writeFileSync(MASTER_STATS_FILE, JSON.stringify(masterData, null, 2));
  } catch (e) {}
  
  lastSave = now;
}

export async function getUser(username: string): Promise<UserStats> {
  // Only load from disk if cache is empty
  if (Object.keys(statsCache).length === 0) {
    statsCache = loadStats();
  }
  
  if (!statsCache[username]) {
    const pointsData = await getPointsData(username);
    statsCache[username] = {
      user: username,
      points: pointsData.points,
      watchtime: 0,
      deaths: 0,
      joinDate: new Date().toISOString(),
      visits: 1,
      lastSeen: new Date().toISOString(),
      totalCards: 0,
      rareCards: 0,
      badges: [],
      cardCollection: []
    };
    await saveStats();
  } else {
    // Sync points from points.json
    const pointsData = await getPointsData(username);
    statsCache[username].points = pointsData.points;
  }
  
  return statsCache[username];
}

export async function updateUser(username: string, updates: Partial<UserStats>) {
  const user = statsCache[username];
  if (!user) {
    console.error(`[UserStats] Cannot update user ${username} - not in cache`);
    return;
  }
  Object.assign(user, updates);
  user.lastSeen = new Date().toISOString();
  statsCache[username] = user;
  console.log(`[UserStats] Saving stats for ${username}...`);
  await saveStats();
}

export async function addCards(username: string, cards: any[]) {
  // Reload cache to get latest data
  statsCache = loadStats();
  
  // Ensure user exists
  if (!statsCache[username]) {
    console.log(`[UserStats] Creating new user ${username} for card collection`);
    const pointsData = await getPointsData(username);
    statsCache[username] = {
      user: username,
      points: pointsData.points,
      watchtime: 0,
      deaths: 0,
      joinDate: new Date().toISOString(),
      visits: 1,
      lastSeen: new Date().toISOString(),
      totalCards: 0,
      rareCards: 0,
      badges: [],
      cardCollection: []
    };
  }
  
  const user = statsCache[username];
  const cardNames: string[] = [];
  
  for (const card of cards) {
    const cardId = `${card.setCode}-${card.number}`;
    if (!user.cardCollection.includes(cardId)) {
      user.cardCollection.push(cardId);
      user.totalCards++;
      cardNames.push(card.name);
      
      if (card.rarity.includes('Rare') || card.rarity.includes('Holo')) {
        user.rareCards++;
      }
    }
  }
  
  // Update badges
  user.badges = [];
  if (user.totalCards >= 20) user.badges.push('Collector');
  if (user.rareCards >= 5) user.badges.push('Rare King');
  if (user.totalCards === 0) user.badges.push('Needs Luck');
  
  await updateUser(username, user);
  console.log(`[UserStats] ${username} now has ${user.totalCards} cards (${user.rareCards} rare)`);
  
  return cardNames;
}

export async function getLeaderboard(stat: 'points' | 'watchtime' | 'totalCards' | 'rareCards' | 'badges', limit = 10) {
  statsCache = loadStats();
  
  // Sync all points
  for (const username of Object.keys(statsCache)) {
    const pointsData = await getPointsData(username);
    statsCache[username].points = pointsData.points;
  }
  
  const exclude = ['blerp', 'mtman1987', 'athenabot87', 'streamelements', 'frostytoolsdotcom'];
  const users = Object.values(statsCache).filter(u => !exclude.includes(u.user.toLowerCase()));
  
  const sorted = users.sort((a, b) => {
    if (stat === 'badges') {
      return b.badges.length - a.badges.length;
    }
    return (b[stat] as number) - (a[stat] as number);
  });
  
  return sorted.slice(0, limit);
}

export async function getUserRank(username: string, stat: 'points' | 'watchtime' | 'totalCards' | 'rareCards' | 'badges'): Promise<number> {
  const leaderboard = await getLeaderboard(stat, 9999);
  return leaderboard.findIndex(u => u.user.toLowerCase() === username.toLowerCase()) + 1;
}

// Initialize cache and import from MasterStats if available
function initializeCache() {
  statsCache = loadStats();
  
  // Import from MasterStats/allUsers.json if it exists and we have no data
  if (Object.keys(statsCache).length === 0 && fs.existsSync(MASTER_STATS_FILE)) {
    try {
      const masterData = JSON.parse(fs.readFileSync(MASTER_STATS_FILE, 'utf-8'));
      for (const [username, masterUser] of Object.entries(masterData as any)) {
        statsCache[username.toLowerCase()] = {
          user: username.toLowerCase(),
          points: masterUser.Points || 0,
          watchtime: masterUser.Watchtime || 0,
          deaths: masterUser.Deaths || 0,
          joinDate: masterUser.JoinDate || new Date().toISOString(),
          visits: masterUser.Visits || 1,
          lastSeen: masterUser.LastSeen || new Date().toISOString(),
          totalCards: masterUser.TotalCards || 0,
          rareCards: masterUser.RareCards || 0,
          badges: masterUser.Badges || [],
          cardCollection: []
        };
      }
      saveStats();
      console.log(`[UserStats] Imported ${Object.keys(statsCache).length} users from MasterStats`);
    } catch (e) {
      console.warn('[UserStats] Failed to import from MasterStats:', e);
    }
  }
}

initializeCache();
