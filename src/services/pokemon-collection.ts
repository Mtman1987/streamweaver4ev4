import { getUserCollection, saveUserCollection } from './pokemon-storage-discord';

type Card = {
  name: string;
  number: string;
  setCode: string;
  rarity: string;
};

export async function addCardsToUser(username: string, cards: Card[]): Promise<void> {
  console.log(`[Pokemon Collection] Adding ${cards.length} cards to ${username}`);
  const collection = await getUserCollection(username);
  console.log(`[Pokemon Collection] Current collection: ${collection.cards.length} cards`);
  collection.cards.push(...cards);
  console.log(`[Pokemon Collection] New collection: ${collection.cards.length} cards`);
  await saveUserCollection(username, collection);
  console.log(`[Pokemon Collection] Saved collection for ${username}`);
}

export async function getUserCards(username: string): Promise<Card[]> {
  const collection = await getUserCollection(username);
  return collection.cards;
}

export async function removeCardFromUser(username: string, cardIndex: number): Promise<Card | null> {
  const collection = await getUserCollection(username);
  
  if (!collection.cards[cardIndex]) return null;
  
  const [card] = collection.cards.splice(cardIndex, 1);
  await saveUserCollection(username, collection);
  return card;
}

export async function addPacksToUser(username: string, count: number): Promise<void> {
  const collection = await getUserCollection(username);
  collection.packs += count;
  await saveUserCollection(username, collection);
}

export async function getUserPacks(username: string): Promise<number> {
  const collection = await getUserCollection(username);
  return collection.packs;
}
