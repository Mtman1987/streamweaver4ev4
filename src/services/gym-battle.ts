import { sendChatMessage } from './twitch';
import { getUserCards } from './pokemon-collection';

interface BattleCard {
  name: string;
  number: string;
  setCode: string;
  hp: string;
  currentHp: number;
  types: string[];
  attacks: Array<{
    name: string;
    cost: string[];
    damage: string;
    text?: string;
  }>;
  level?: string;
  rarity: string;
  imageUrl: string;
}

interface BattlePlayer {
  username: string;
  cards: BattleCard[];
  activeCardIndex: number;
  energy: number;
  isGymLeader: boolean;
  avatar: string;
}

interface GymBattle {
  challenger: BattlePlayer;
  gymLeader: BattlePlayer;
  currentTurn: 'challenger' | 'gymLeader';
  turnCount: number;
  gymBadge: {
    name: string;
    avatar: string;
  };
  expiresAt: number;
}

const activeBattles = new Map<string, GymBattle>();
const BATTLE_TIMEOUT = 300000; // 5 minutes

function getBattleKey(challenger: string, gymLeader: string): string {
  return `${challenger.toLowerCase()}-${gymLeader.toLowerCase()}`;
}

export async function challengeGymLeader(challenger: string, gymLeader: string): Promise<void> {
  const key = getBattleKey(challenger, gymLeader);
  
  if (activeBattles.has(key)) {
    await sendChatMessage(`@${challenger}, you already have an active battle with @${gymLeader}!`, 'broadcaster');
    return;
  }
  
  // Check if challenger has cards
  const challengerCards = await getUserCards(challenger);
  if (challengerCards.length < 3) {
    await sendChatMessage(`@${challenger}, you need at least 3 cards to challenge a gym leader! Use !pack to get cards.`, 'broadcaster');
    return;
  }
  
  // Check if gym leader has cards
  const gymLeaderCards = await getUserCards(gymLeader);
  if (gymLeaderCards.length < 3) {
    await sendChatMessage(`@${challenger}, ${gymLeader} doesn't have enough cards to battle!`, 'broadcaster');
    return;
  }
  
  // Auto-select 3 random cards for both players
  const challengerBattleCards = selectBattleCards(challengerCards);
  const gymLeaderBattleCards = selectBattleCards(gymLeaderCards);
  
  const gymLeaderAvatar = `https://static-cdn.jtvnw.net/jtv_user_pictures/${gymLeader}-profile_image-300x300.png`;
  
  const battle: GymBattle = {
    challenger: {
      username: challenger,
      cards: challengerBattleCards,
      activeCardIndex: 0,
      energy: 0,
      isGymLeader: false,
      avatar: `https://static-cdn.jtvnw.net/jtv_user_pictures/${challenger}-profile_image-300x300.png`
    },
    gymLeader: {
      username: gymLeader,
      cards: gymLeaderBattleCards,
      activeCardIndex: 0,
      energy: 0,
      isGymLeader: true,
      avatar: gymLeaderAvatar
    },
    currentTurn: 'challenger',
    turnCount: 1,
    gymBadge: {
      name: `${gymLeader} Gym Badge`,
      avatar: gymLeaderAvatar
    },
    expiresAt: Date.now() + BATTLE_TIMEOUT
  };
  
  activeBattles.set(key, battle);
  
  // Broadcast battle start
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
      type: 'gym-battle-start',
      payload: {
        challenger: battle.challenger,
        gymLeader: battle.gymLeader,
        badge: battle.gymBadge
      }
    });
  }
  
  await sendChatMessage(
    `🏅 GYM BATTLE! @${challenger} challenges Gym Leader @${gymLeader}! Battle for the ${battle.gymBadge.name}!`,
    'broadcaster'
  );
  
  // Athena announces
  const announcement = `A gym battle has begun! ${challenger} is challenging ${gymLeader} for the gym badge! Good luck to both trainers!`;
  await sendChatMessage(announcement, 'bot');
  
  await sendChatMessage(
    `@${challenger}, your turn! Use !attack 1 or !attack 2 to attack, !switch 2 or !switch 3 to switch Pokemon, or !pass to skip.`,
    'broadcaster'
  );
}

function selectBattleCards(userCards: any[]): BattleCard[] {
  // Shuffle and pick 3 cards
  const shuffled = [...userCards].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  
  return selected.map(card => ({
    name: card.name,
    number: card.number,
    setCode: card.setCode,
    hp: card.hp || '50',
    currentHp: parseInt(card.hp || '50'),
    types: card.types || ['Colorless'],
    attacks: card.attacks || [
      { name: 'Quick Attack', cost: ['Colorless'], damage: '10', text: 'A quick strike' },
      { name: 'Power Attack', cost: ['Colorless', 'Colorless'], damage: '20', text: 'A powerful blow' }
    ],
    level: card.level,
    rarity: card.rarity,
    imageUrl: card.images?.large || `https://images.pokemontcg.io/${card.setCode}/${card.number}.png`
  }));
}

export async function battleAttack(username: string, attackIndex: number): Promise<void> {
  const battle = findBattleByPlayer(username);
  if (!battle) {
    await sendChatMessage(`@${username}, you're not in a battle!`, 'broadcaster');
    return;
  }
  
  const key = getBattleKey(battle.challenger.username, battle.gymLeader.username);
  const isChallenger = username.toLowerCase() === battle.challenger.username.toLowerCase();
  const attacker = isChallenger ? battle.challenger : battle.gymLeader;
  const defender = isChallenger ? battle.gymLeader : battle.challenger;
  
  // Check if it's their turn
  if ((isChallenger && battle.currentTurn !== 'challenger') || (!isChallenger && battle.currentTurn !== 'gymLeader')) {
    await sendChatMessage(`@${username}, it's not your turn!`, 'broadcaster');
    return;
  }
  
  const activeCard = attacker.cards[attacker.activeCardIndex];
  const attack = activeCard.attacks[attackIndex - 1];
  
  if (!attack) {
    await sendChatMessage(`@${username}, that attack doesn't exist! Use !attack 1 or !attack 2`, 'broadcaster');
    return;
  }
  
  // Check energy cost
  const energyCost = attack.cost.length;
  if (attacker.energy < energyCost) {
    await sendChatMessage(`@${username}, you need ${energyCost} energy but only have ${attacker.energy}!`, 'broadcaster');
    return;
  }
  
  // Calculate damage
  const damageMatch = attack.damage.match(/\d+/);
  const damage = damageMatch ? parseInt(damageMatch[0]) : 0;
  
  // Apply damage
  const defenderCard = defender.cards[defender.activeCardIndex];
  defenderCard.currentHp = Math.max(0, defenderCard.currentHp - damage);
  
  // Spend energy
  attacker.energy -= energyCost;
  
  // Broadcast attack
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
      type: 'gym-battle-attack',
      payload: {
        attacker: attacker.username,
        defender: defender.username,
        attackName: attack.name,
        damage,
        attackerCard: activeCard,
        defenderCard,
        attackerEnergy: attacker.energy,
        defenderEnergy: defender.energy
      }
    });
  }
  
  await sendChatMessage(
    `${activeCard.name} used ${attack.name}! ${damage} damage to ${defenderCard.name}! (${defenderCard.currentHp}/${defenderCard.hp} HP remaining)`,
    'broadcaster'
  );
  
  // Check if defender's card fainted
  if (defenderCard.currentHp <= 0) {
    await sendChatMessage(`${defenderCard.name} fainted!`, 'broadcaster');
    
    // Check if defender has any cards left
    const remainingCards = defender.cards.filter(c => c.currentHp > 0);
    if (remainingCards.length === 0) {
      await endBattle(battle, attacker.username);
      activeBattles.delete(key);
      return;
    }
    
    // Auto-switch to next available card
    const nextCardIndex = defender.cards.findIndex(c => c.currentHp > 0);
    defender.activeCardIndex = nextCardIndex;
    await sendChatMessage(`@${defender.username} sent out ${defender.cards[nextCardIndex].name}!`, 'broadcaster');
  }
  
  // End turn
  await endTurn(battle);
}

export async function battleSwitch(username: string, cardIndex: number): Promise<void> {
  const battle = findBattleByPlayer(username);
  if (!battle) {
    await sendChatMessage(`@${username}, you're not in a battle!`, 'broadcaster');
    return;
  }
  
  const isChallenger = username.toLowerCase() === battle.challenger.username.toLowerCase();
  const player = isChallenger ? battle.challenger : battle.gymLeader;
  
  // Check if it's their turn
  if ((isChallenger && battle.currentTurn !== 'challenger') || (!isChallenger && battle.currentTurn !== 'gymLeader')) {
    await sendChatMessage(`@${username}, it's not your turn!`, 'broadcaster');
    return;
  }
  
  const targetIndex = cardIndex - 1;
  if (targetIndex < 0 || targetIndex >= player.cards.length) {
    await sendChatMessage(`@${username}, invalid card number! Use !switch 1, !switch 2, or !switch 3`, 'broadcaster');
    return;
  }
  
  if (player.cards[targetIndex].currentHp <= 0) {
    await sendChatMessage(`@${username}, that Pokemon has fainted!`, 'broadcaster');
    return;
  }
  
  if (targetIndex === player.activeCardIndex) {
    await sendChatMessage(`@${username}, that Pokemon is already active!`, 'broadcaster');
    return;
  }
  
  player.activeCardIndex = targetIndex;
  
  // Broadcast switch
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
      type: 'gym-battle-switch',
      payload: {
        player: player.username,
        newCard: player.cards[targetIndex]
      }
    });
  }
  
  await sendChatMessage(`@${username} switched to ${player.cards[targetIndex].name}!`, 'broadcaster');
  
  // End turn
  await endTurn(battle);
}

export async function battlePass(username: string): Promise<void> {
  const battle = findBattleByPlayer(username);
  if (!battle) {
    await sendChatMessage(`@${username}, you're not in a battle!`, 'broadcaster');
    return;
  }
  
  const isChallenger = username.toLowerCase() === battle.challenger.username.toLowerCase();
  
  // Check if it's their turn
  if ((isChallenger && battle.currentTurn !== 'challenger') || (!isChallenger && battle.currentTurn !== 'gymLeader')) {
    await sendChatMessage(`@${username}, it's not your turn!`, 'broadcaster');
    return;
  }
  
  await sendChatMessage(`@${username} passed their turn.`, 'broadcaster');
  await endTurn(battle);
}

async function endTurn(battle: GymBattle): Promise<void> {
  // Switch turn
  battle.currentTurn = battle.currentTurn === 'challenger' ? 'gymLeader' : 'challenger';
  battle.turnCount++;
  
  // Add energy to new active player
  const activePlayer = battle.currentTurn === 'challenger' ? battle.challenger : battle.gymLeader;
  activePlayer.energy++;
  
  // Broadcast turn change
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
      type: 'gym-battle-turn',
      payload: {
        currentTurn: battle.currentTurn,
        turnCount: battle.turnCount,
        challenger: battle.challenger,
        gymLeader: battle.gymLeader
      }
    });
  }
  
  await sendChatMessage(
    `@${activePlayer.username}'s turn! Energy: ${activePlayer.energy} | Active: ${activePlayer.cards[activePlayer.activeCardIndex].name} (${activePlayer.cards[activePlayer.activeCardIndex].currentHp}/${activePlayer.cards[activePlayer.activeCardIndex].hp} HP)`,
    'broadcaster'
  );
}

async function endBattle(battle: GymBattle, winner: string): Promise<void> {
  const isChallenger = winner.toLowerCase() === battle.challenger.username.toLowerCase();
  
  // Broadcast battle end
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
      type: 'gym-battle-end',
      payload: {
        winner,
        badge: isChallenger ? battle.gymBadge : null,
        challenger: battle.challenger,
        gymLeader: battle.gymLeader
      }
    });
  }
  
  if (isChallenger) {
    // Challenger won - award badge
    await awardGymBadge(winner, battle.gymBadge);
    await sendChatMessage(`🏅 VICTORY! @${winner} defeated Gym Leader @${battle.gymLeader.username} and earned the ${battle.gymBadge.name}!`, 'broadcaster');
    
    // Athena congratulates
    const congrats = `Congratulations ${winner}! You've proven yourself as a skilled trainer and earned the ${battle.gymBadge.name}! Your journey continues!`;
    await sendChatMessage(congrats, 'bot');
  } else {
    // Gym leader won
    await sendChatMessage(`💪 Gym Leader @${battle.gymLeader.username} defended their badge! @${battle.challenger.username}, train harder and try again!`, 'broadcaster');
    
    // Athena encourages
    const encourage = `${battle.challenger.username}, don't give up! Every defeat makes you stronger. Keep training and challenge the gym leader again when you're ready!`;
    await sendChatMessage(encourage, 'bot');
  }
}

async function awardGymBadge(username: string, badge: { name: string; avatar: string }): Promise<void> {
  try {
    const { getUser, updateUser } = require('./user-stats');
    const user = await getUser(username);
    
    // Check if they already have this badge
    if (!user.badges) user.badges = [];
    if (user.badges.some((b: any) => b.name === badge.name)) {
      return; // Already has this badge
    }
    
    user.badges.push({
      name: badge.name,
      avatar: badge.avatar,
      earnedAt: new Date().toISOString()
    });
    
    await updateUser(username, user);
  } catch (error) {
    console.error('[Gym Battle] Failed to award badge:', error);
  }
}

function findBattleByPlayer(username: string): GymBattle | null {
  const lower = username.toLowerCase();
  for (const battle of activeBattles.values()) {
    if (battle.challenger.username.toLowerCase() === lower || battle.gymLeader.username.toLowerCase() === lower) {
      return battle;
    }
  }
  return null;
}

// Cleanup expired battles
setInterval(() => {
  const now = Date.now();
  for (const [key, battle] of activeBattles.entries()) {
    if (battle.expiresAt < now) {
      activeBattles.delete(key);
      sendChatMessage(
        `⏰ Gym battle between @${battle.challenger.username} and @${battle.gymLeader.username} expired!`,
        'broadcaster'
      ).catch(() => {});
    }
  }
}, 30000);
