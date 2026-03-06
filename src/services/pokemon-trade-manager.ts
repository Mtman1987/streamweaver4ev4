import { sendChatMessage } from './twitch';

interface TradeSession {
  initiator: string;
  target: string;
  initiatorCard?: string;
  targetCard?: string;
  initiatorAccepted: boolean;
  targetAccepted: boolean;
  expiresAt: number;
}

const activeTrades = new Map<string, TradeSession>();
const TRADE_TIMEOUT = 120000; // 2 minutes

function getTradeKey(user1: string, user2: string): string {
  return [user1, user2].sort().join(':');
}

export async function initiateTrade(initiator: string, target: string): Promise<void> {
  const key = getTradeKey(initiator, target);
  
  if (activeTrades.has(key)) {
    await sendChatMessage(`@${initiator}, you already have an active trade with @${target}!`, 'broadcaster');
    return;
  }
  
  activeTrades.set(key, {
    initiator,
    target,
    initiatorAccepted: false,
    targetAccepted: false,
    expiresAt: Date.now() + TRADE_TIMEOUT
  });
  
  await sendChatMessage(
    `@${initiator} wants to trade with @${target}! Both users: use !offer <card> to select your card.`,
    'broadcaster'
  );
}

export async function offerCard(username: string, cardIdentifier: string): Promise<void> {
  const trade = Array.from(activeTrades.entries()).find(([_, session]) => 
    session.initiator === username || session.target === username
  );
  
  if (!trade) {
    await sendChatMessage(`@${username}, you don't have an active trade!`, 'broadcaster');
    return;
  }
  
  const [key, session] = trade;
  
  // Get user's Pokemon cards
  const { getUserCards } = require('./pokemon-collection');
  const userCards = await getUserCards(username);
  
  if (userCards.length === 0) {
    await sendChatMessage(`@${username}, you don't have any cards!`, 'broadcaster');
    return;
  }
  
  // Parse identifier: "name number" or "setCode-number"
  const parts = cardIdentifier.trim().split(/\s+/);
  let matches = [];
  
  if (parts.length === 2) {
    // Format: "growlithe 28" or "base1 28"
    const [nameOrSet, number] = parts;
    const searchLower = nameOrSet.toLowerCase();
    
    matches = userCards.filter((card: any) => 
      card.number === number && 
      (card.name.toLowerCase().includes(searchLower) || card.setCode.toLowerCase() === searchLower)
    );
  } else if (cardIdentifier.includes('-')) {
    // Format: "base1-28"
    const [setCode, number] = cardIdentifier.split('-');
    matches = userCards.filter((card: any) => 
      card.setCode.toLowerCase() === setCode.toLowerCase() && card.number === number
    );
  } else {
    await sendChatMessage(`@${username}, use format: !offer <name/set> <number> or !offer <set>-<number>`, 'broadcaster');
    return;
  }
  
  if (matches.length === 0) {
    await sendChatMessage(`@${username}, card not found in your collection!`, 'broadcaster');
    return;
  }
  
  if (matches.length > 1) {
    const cardList = matches.map((c: any) => `${c.name} (${c.setCode}-${c.number})`).join(', ');
    await sendChatMessage(`@${username}, multiple matches found: ${cardList}. Be more specific!`, 'broadcaster');
    return;
  }
  
  const card = matches[0];
  const cardId = `${card.setCode}-${card.number}`;
  
  // Update session
  if (session.initiator === username) {
    session.initiatorCard = cardId;
  } else {
    session.targetCard = cardId;
  }
  
  await sendChatMessage(`@${username} offered ${card.name} (${cardId})!`, 'broadcaster');
  
  // Check if both cards are selected
  if (session.initiatorCard && session.targetCard) {
    await sendChatMessage(
      `Trade ready! @${session.initiator} (${session.initiatorCard}) ↔ @${session.target} (${session.targetCard}). Both type !accept to confirm!`,
      'broadcaster'
    );
    
    // Show trade preview
    const broadcast = (global as any).broadcast;
    if (broadcast) {
      broadcast({
        type: 'pokemon-trade-preview',
        userA: session.initiator,
        userB: session.target,
        cardA: session.initiatorCard,
        cardB: session.targetCard,
        avatarA: `https://static-cdn.jtvnw.net/jtv_user_pictures/${session.initiator}-profile_image-300x300.png`,
        avatarB: `https://static-cdn.jtvnw.net/jtv_user_pictures/${session.target}-profile_image-300x300.png`
      });
    }
  }
}

export async function acceptTrade(username: string): Promise<void> {
  const trade = Array.from(activeTrades.entries()).find(([_, session]) => 
    session.initiator === username || session.target === username
  );
  
  if (!trade) {
    await sendChatMessage(`@${username}, you don't have an active trade!`, 'broadcaster');
    return;
  }
  
  const [key, session] = trade;
  
  if (!session.initiatorCard || !session.targetCard) {
    await sendChatMessage(`@${username}, both users must offer cards first!`, 'broadcaster');
    return;
  }
  
  // Mark acceptance
  if (session.initiator === username) {
    session.initiatorAccepted = true;
  } else {
    session.targetAccepted = true;
  }
  
  await sendChatMessage(`@${username} accepted the trade!`, 'broadcaster');
  
  // Execute trade if both accepted
  if (session.initiatorAccepted && session.targetAccepted) {
    await executeTrade(session);
    activeTrades.delete(key);
  }
}

export async function cancelTrade(username: string): Promise<void> {
  const trade = Array.from(activeTrades.entries()).find(([_, session]) => 
    session.initiator === username || session.target === username
  );
  
  if (!trade) {
    await sendChatMessage(`@${username}, you don't have an active trade!`, 'broadcaster');
    return;
  }
  
  const [key, session] = trade;
  activeTrades.delete(key);
  
  await sendChatMessage(`Trade between @${session.initiator} and @${session.target} cancelled!`, 'broadcaster');
}

async function executeTrade(session: TradeSession): Promise<void> {
  const { getUser, updateUser } = require('./user-stats');
  
  const userA = await getUser(session.initiator);
  const userB = await getUser(session.target);
  
  // Remove cards from each user
  userA.cardCollection = userA.cardCollection.filter((id: string) => id !== session.initiatorCard);
  userB.cardCollection = userB.cardCollection.filter((id: string) => id !== session.targetCard);
  
  // Add cards to each user
  userA.cardCollection.push(session.targetCard!);
  userB.cardCollection.push(session.initiatorCard!);
  
  // Update totals
  userA.totalCards = userA.cardCollection.length;
  userB.totalCards = userB.cardCollection.length;
  
  await updateUser(session.initiator, userA);
  await updateUser(session.target, userB);
  
  // Trigger trade animation
  const broadcast = (global as any).broadcast;
  if (broadcast) {
    broadcast({
      type: 'pokemon-trade-execute',
      userA: session.initiator,
      userB: session.target,
      cardA: session.initiatorCard,
      cardB: session.targetCard,
      avatarA: `https://static-cdn.jtvnw.net/jtv_user_pictures/${session.initiator}-profile_image-300x300.png`,
      avatarB: `https://static-cdn.jtvnw.net/jtv_user_pictures/${session.target}-profile_image-300x300.png`
    });
  }
  
  await sendChatMessage(
    `✅ Trade complete! @${session.initiator} received ${session.targetCard}, @${session.target} received ${session.initiatorCard}!`,
    'broadcaster'
  );
}

// Cleanup expired trades
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeTrades.entries()) {
    if (session.expiresAt < now) {
      activeTrades.delete(key);
      sendChatMessage(
        `Trade between @${session.initiator} and @${session.target} expired!`,
        'broadcaster'
      ).catch(() => {});
    }
  }
}, 30000);
