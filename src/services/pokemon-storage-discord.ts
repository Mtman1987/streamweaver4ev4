import { getChannelMessages, uploadFileToDiscord, deleteMessage } from './discord';
import { readJsonFile, writeJsonFile } from './storage';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_CHANNEL_ID = '1476540488147533895';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const LOCAL_BACKUP_DIR = 'pokemon-users';

type Card = {
  name: string;
  number: string;
  setCode: string;
  rarity: string;
};

type UserCollection = {
  cards: Card[];
  packs: number;
  updatedAt: string;
  messageId?: string;
};

// In-memory cache
const cache = new Map<string, { data: UserCollection; timestamp: number }>();

function getCacheKey(username: string): string {
  return username.toLowerCase();
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

async function fetchFromDiscord(username: string): Promise<{ collection: UserCollection; messageId?: string } | null> {
  try {
    const messages = await getChannelMessages(STORAGE_CHANNEL_ID, 100);
    const fileName = `${username.toLowerCase()}.json`;
    
    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        const attachment = msg.attachments.find((a: any) => a.name === fileName);
        if (attachment) {
          const response = await fetch(attachment.url);
          const data = await response.json();
          return { collection: data as UserCollection, messageId: msg.id };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('[Pokemon Storage] Discord fetch failed:', error);
    return null;
  }
}

async function saveToDiscord(username: string, data: UserCollection): Promise<void> {
  try {
    const fileName = `${username.toLowerCase()}.json`;
    
    // Delete old message if exists
    if (data.messageId) {
      try {
        await deleteMessage(STORAGE_CHANNEL_ID, data.messageId);
        console.log(`[Pokemon Storage] Deleted old message: ${data.messageId}`);
      } catch (err) {
        console.log('[Pokemon Storage] Could not delete old message:', err);
      }
    } else {
      // Try to find and delete ALL old messages for this user
      const messages = await getChannelMessages(STORAGE_CHANNEL_ID, 100);
      const fileName = `${username.toLowerCase()}.json`;
      for (const msg of messages) {
        // Check if message has the user's file attachment OR mentions the user
        const hasAttachment = msg.attachments?.some((a: any) => a.name === fileName);
        const hasUserMention = msg.content?.includes(`User: ${username}`);
        
        if (hasAttachment || hasUserMention) {
          try {
            await deleteMessage(STORAGE_CHANNEL_ID, msg.id);
            console.log(`[Pokemon Storage] Deleted old message: ${msg.id}`);
          } catch (err) {
            console.log('[Pokemon Storage] Could not delete old message:', err);
          }
        }
      }
    }
    
    // Upload new file and get message ID (don't include messageId in the file)
    const dataToSave = { cards: data.cards, packs: data.packs, updatedAt: data.updatedAt };
    const result = await uploadFileToDiscord(
      STORAGE_CHANNEL_ID,
      JSON.stringify(dataToSave, null, 2),
      fileName,
      `[ID:${Date.now().toString(36)}] User: ${username} | ${data.cards.length} cards, ${data.packs} packs`
    );
    
    // Store message ID for next update
    if (result && result.data && (result.data as any).id) {
      data.messageId = (result.data as any).id;
      console.log(`[Pokemon Storage] Saved with new messageId: ${data.messageId}`);
    }
    
    // Update cache
    cache.set(getCacheKey(username), { data, timestamp: Date.now() });
    
    // Local backup - ensure directory exists (include messageId for next deletion)
    const backupDir = path.join(process.cwd(), 'data', 'pokemon-users');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupData = { ...dataToSave, messageId: data.messageId };
    fs.writeFileSync(path.join(backupDir, fileName), JSON.stringify(backupData, null, 2));
    
    console.log(`[Pokemon Storage] Saved ${username}: ${data.cards.length} cards (messageId: ${data.messageId})`);
  } catch (error) {
    console.error('[Pokemon Storage] Discord save failed:', error);
    throw error;
  }
}

async function loadFromLocalBackup(username: string): Promise<UserCollection | null> {
  try {
    const fileName = `${username.toLowerCase()}.json`;
    return await readJsonFile<UserCollection>(`${LOCAL_BACKUP_DIR}/${fileName}`, null);
  } catch {
    return null;
  }
}

export async function getUserCollection(username: string): Promise<UserCollection> {
  const key = getCacheKey(username);
  
  // Check cache
  const cached = cache.get(key);
  if (cached && isCacheValid(cached.timestamp)) {
    console.log(`[Pokemon Storage] Using cached data for ${username}, messageId: ${cached.data.messageId}`);
    return cached.data;
  }
  
  // Try Discord
  let result = await fetchFromDiscord(username);
  let data: UserCollection;
  
  if (result) {
    data = result.collection;
    data.messageId = result.messageId;
    console.log(`[Pokemon Storage] Fetched from Discord for ${username}, messageId: ${data.messageId}`);
  } else {
    // Fallback to local backup
    const localData = await loadFromLocalBackup(username);
    if (localData) {
      data = localData;
      console.log(`[Pokemon Storage] Loaded from local backup for ${username}`);
    } else {
      // Create new if not found
      data = { cards: [], packs: 0, updatedAt: new Date().toISOString() };
      console.log(`[Pokemon Storage] Created new collection for ${username}`);
    }
  }
  
  // Update cache
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}

export async function saveUserCollection(username: string, data: UserCollection): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await saveToDiscord(username, data);
}
