import fs from 'fs';
import path from 'path';
import { addCardsToUser } from './pokemon-collection';

const CARDS_DB_DIR = path.join(process.cwd(), 'pokemon-tcg-data-master', 'cards', 'en');

const SET_MAP: Record<number, { code: string; name: string; file: string }> = {
  1: { code: 'base1', name: 'Base Set', file: 'base1.json' },
  2: { code: 'base2', name: 'Jungle', file: 'base2.json' },
  3: { code: 'base3', name: 'Fossil', file: 'base3.json' },
  4: { code: 'base4', name: 'Base Set 2', file: 'base4.json' },
  5: { code: 'gym2', name: 'Team Rocket', file: 'gym2.json' },
  6: { code: 'gym1', name: 'Gym Heroes', file: 'gym1.json' },
};

function pickRandom(arr: any[], count: number): any[] {
  const result = [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    result.push(shuffled[i]);
  }
  return result;
}

export async function openPack(setNumber: number, username: string) {
  const setInfo = SET_MAP[setNumber];
  if (!setInfo) return null;
  
  if (!fs.existsSync(CARDS_DB_DIR)) {
    console.log(`[Pokemon] Cards database directory not found: ${CARDS_DB_DIR}`);
    return null;
  }
  
  const filePath = path.join(CARDS_DB_DIR, setInfo.file);
  if (!fs.existsSync(filePath)) {
    console.log(`[Pokemon] Set file not found: ${filePath}`);
    return null;
  }
  
  const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Categorize cards by rarity - only include cards that have a rarity field
  const common = cardData.filter((c: any) => c.rarity === 'Common');
  const uncommon = cardData.filter((c: any) => c.rarity === 'Uncommon');
  const rare = cardData.filter((c: any) => c.rarity === 'Rare' || c.rarity === 'Rare Holo');
  const other = cardData.filter((c: any) => c.supertype === 'Energy' || c.supertype === 'Trainer');
  
  console.log(`[Pokemon] ${setInfo.name} - Common: ${common.length}, Uncommon: ${uncommon.length}, Rare: ${rare.length}, Other: ${other.length}`);
  
  if (common.length < 4 || uncommon.length < 3 || rare.length < 1 || other.length < 1) {
    console.log(`[Pokemon] Not enough cards in ${setInfo.name}`);
    return null;
  }
  
  // Build pack: 4 common, 3 uncommon, 1 rare, 1 energy/trainer
  const pack = [
    ...pickRandom(common, 4),
    ...pickRandom(uncommon, 3),
    ...pickRandom(rare, 1),
    ...pickRandom(other, 1)
  ].map(card => ({
    name: card.name,
    number: card.number,
    setCode: setInfo.code,
    rarity: card.rarity || 'Common',
    imageUrl: card.images?.large || `https://images.pokemontcg.io/${setInfo.code}/${card.number}.png`
  }));
  
  console.log(`[Pokemon] ${username} opened ${setInfo.name} pack`);
  console.log(`[Pokemon] Pack contents:`, pack.map(c => `${c.name} (${c.rarity})`));
  
  await addCardsToUser(username, pack);
  
  // Broadcast pack opening to overlay
  if (typeof (global as any).broadcast === 'function') {
    const payload = { pack, setName: setInfo.name, username };
    // Emit both event names for compatibility with older/newer overlays.
    (global as any).broadcast({
      type: 'pokemon-pack-open',
      payload
    });
    (global as any).broadcast({
      type: 'pokemon-pack-opened',
      payload
    });
  }
  
  return {
    pack,
    setName: setInfo.name,
    setCode: setInfo.code,
    username
  };
}
