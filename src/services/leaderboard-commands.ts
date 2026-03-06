import { getLeaderboard, getUser, getUserRank } from './user-stats';
import { sendChatMessage } from './twitch';

const COOLDOWNS = {
  user: new Map<string, number>(),
  global: 0
};

function checkCooldown(username: string): boolean {
  const now = Date.now();
  
  if (now - COOLDOWNS.global < 300) return false;
  COOLDOWNS.global = now;
  
  const lastUser = COOLDOWNS.user.get(username) || 0;
  if (now - lastUser < 2000) return false;
  COOLDOWNS.user.set(username, now);
  
  return true;
}

export async function handleLeaderboardCommand(command: string, username: string, args: string, broadcast: Function) {
  if (!checkCooldown(username)) return;
  
  const user = await getUser(username);
  
  // !leader - show profile
  if (command === '!leader') {
    const profile = {
      type: 'profile',
      user: username,
      points: user.points,
      watchtime: user.watchtime,
      deaths: user.deaths,
      visits: user.visits,
      lastSeen: user.lastSeen,
      joinDate: user.joinDate,
      totalCards: user.totalCards,
      rareCards: user.rareCards,
      badges: user.badges
    };
    
    broadcast({
      type: 'leaderboard-profile',
      payload: profile
    });
    
    // Send chat response
    const hours = Math.floor(user.watchtime / 60);
    const badges = user.badges.length > 0 ? ` | Badges: ${user.badges.length}` : '';
    sendChatMessage(
      `@${username} | Points: ${user.points.toLocaleString()} | Watchtime: ${hours}h | Cards: ${user.totalCards} (${user.rareCards} rare)${badges}`,
      'bot'
    ).catch(() => {});
    return;
  }
  
  // Determine stat type
  let stat: 'points' | 'watchtime' | 'totalCards' | 'rareCards' | 'badges' | 'bits';
  let statName: string;
  
  switch (command) {
    case '!pleader':
      stat = 'points';
      statName = 'Points';
      break;
    case '!wleader':
      stat = 'watchtime';
      statName = 'Watchtime';
      break;
    case '!cleader':
      stat = 'rareCards';
      statName = 'Rare Cards';
      break;
    case '!bleader':
      stat = 'badges';
      statName = 'Badges';
      break;
    case '!bitsleader':
      stat = 'bits';
      statName = 'Bits';
      break;
    default:
      return;
  }
  
  const leaderboard = await getLeaderboard(stat, 10);
  const myRank = await getUserRank(username, stat);
  const myValue = stat === 'badges' ? user.badges.length : user[stat];
  
  // Check for @mention comparison
  const mentionMatch = args.match(/@(\w+)/);
  if (mentionMatch) {
    const target = mentionMatch[1].toLowerCase();
    const other = await getUser(target);
    const theirRank = await getUserRank(target, stat);
    const theirValue = stat === 'badges' ? other.badges.length : other[stat];
    
    broadcast({
      type: 'leaderboard-compare',
      payload: {
        stat: statName.toLowerCase(),
        requester: { user: username, rank: myRank, value: myValue },
        target: { user: target, rank: theirRank, value: theirValue },
        ahead: myRank < theirRank
      }
    });
    
    // Send chat response
    const ahead = myRank < theirRank;
    const emoji = ahead ? '🎯' : '💥';
    sendChatMessage(
      `@${username} (#${myRank} - ${myValue}) vs @${target} (#${theirRank} - ${theirValue}) → ${ahead ? 'You\'re ahead!' : 'They\'re ahead!'} ${emoji}`,
      'bot'
    ).catch(() => {});
  } else {
    broadcast({
      type: 'leaderboard-top',
      payload: {
        stat: statName.toLowerCase(),
        title: `Top 10 by ${statName}`,
        entries: leaderboard.map((u, i) => ({
          rank: i + 1,
          user: u.user,
          value: stat === 'badges' ? u.badges.length : u[stat],
          badges: u.badges,
          totalCards: u.totalCards,
          rareCards: u.rareCards
        })),
        you: { user: username, rank: myRank, value: myValue }
      }
    });
    
    // Send chat response
    sendChatMessage(
      `@${username}, you're currently #${myRank} with ${myValue} ${statName.toLowerCase()}!`,
      'bot'
    ).catch(() => {});
  }
}
