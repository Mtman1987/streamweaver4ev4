const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    env[key] = value;
  }
});

async function fixUser() {
  // Look up mrmonstermunch2000's real Twitch ID
  const res = await fetch(`https://api.twitch.tv/helix/users?login=mrmonstermunch2000`, {
    headers: {
      'Client-ID': env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${env.TWITCH_BOT_OAUTH_TOKEN}`
    }
  });
  
  const data = await res.json();
  if (!data.data?.[0]) {
    console.log('❌ User not found');
    process.exit(1);
  }
  
  const realId = `user_${data.data[0].id}`;
  console.log(`Real ID: ${realId}`);
  
  // Load tag-stats.json
  const statsPath = path.join(__dirname, '..', 'data', 'tag-stats.json');
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  
  // Find and update player
  const playerIndex = stats.players.findIndex(p => p.id === 'user_549531897');
  if (playerIndex >= 0) {
    stats.players[playerIndex].id = realId;
    console.log(`✅ Updated player ID`);
  }
  
  // Update tags
  stats.tags.forEach(tag => {
    if (tag.from === 'user_549531897') tag.from = realId;
    if (tag.to === 'user_549531897') tag.to = realId;
  });
  
  // Update immunity
  const newImmunity = {};
  for (const [key, value] of Object.entries(stats.immunity)) {
    const newKey = key.replace('user_549531897', realId);
    const newValue = value === 'user_549531897' ? realId : value;
    newImmunity[newKey] = newValue;
  }
  stats.immunity = newImmunity;
  
  // Update currentIt
  if (stats.currentIt === 'user_549531897') {
    stats.currentIt = realId;
  }
  
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log('✅ Fixed streamweaver tag-stats.json');
}

fixUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
