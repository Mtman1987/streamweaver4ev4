import * as fs from 'fs/promises';
import { resolve } from 'path';

interface WelcomeWagonData {
  shoutouts: Record<string, number>; // username -> timestamp
  excludedUsers: string[];
}

const WELCOME_WAGON_PATH = resolve(process.cwd(), 'tokens', 'welcome-wagon.json');
const BLACKLISTED_BOTS = [
  'streamelements',
  'nightbot',
  'moobot',
  'streamlabs',
  'blerp',
  'fossabot',
  'wizebot',
  'botisimo',
  'coebot',
  'ankhbot',
  'deepbot',
  'phantombot',
  'vivbot',
  'ohbot',
  'supibot'
];

async function loadWelcomeWagonData(): Promise<WelcomeWagonData> {
  try {
    const data = await fs.readFile(WELCOME_WAGON_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { shoutouts: {}, excludedUsers: [] };
  }
}

async function saveWelcomeWagonData(data: WelcomeWagonData): Promise<void> {
  await fs.writeFile(WELCOME_WAGON_PATH, JSON.stringify(data, null, 2));
}

export async function canShoutoutUser(username: string): Promise<boolean> {
  const data = await loadWelcomeWagonData();
  const lowerUsername = username.toLowerCase();
  
  // Check if user is a blacklisted bot
  if (BLACKLISTED_BOTS.includes(lowerUsername)) {
    return false;
  }
  
  // Check if user is excluded
  if (data.excludedUsers.includes(lowerUsername)) {
    return false;
  }
  
  // Check if user was shouted out in last 24 hours
  const lastShoutout = data.shoutouts[lowerUsername];
  if (lastShoutout && Date.now() - lastShoutout < 24 * 60 * 60 * 1000) {
    return false;
  }
  
  return true;
}

export async function recordShoutout(username: string): Promise<void> {
  const data = await loadWelcomeWagonData();
  data.shoutouts[username.toLowerCase()] = Date.now();
  await saveWelcomeWagonData(data);
}

export async function addExcludedUser(username: string): Promise<void> {
  const data = await loadWelcomeWagonData();
  const lowerUsername = username.toLowerCase();
  if (!data.excludedUsers.includes(lowerUsername)) {
    data.excludedUsers.push(lowerUsername);
    await saveWelcomeWagonData(data);
  }
}

export async function removeExcludedUser(username: string): Promise<void> {
  const data = await loadWelcomeWagonData();
  const lowerUsername = username.toLowerCase();
  data.excludedUsers = data.excludedUsers.filter(u => u !== lowerUsername);
  await saveWelcomeWagonData(data);
}

export async function getExcludedUsers(): Promise<string[]> {
  const data = await loadWelcomeWagonData();
  return data.excludedUsers;
}