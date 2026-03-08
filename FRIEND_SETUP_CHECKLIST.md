# StreamWeaver Setup Checklist for New Users

## Issues Found & Solutions

### 1. Bot Name Not Working
**Problem:** Bot name was hardcoded to "Athena" in command files
**Solution:** Commands now use `{{BOT_NAME}}` placeholder that reads from config

### 2. AI Response Failed
**Problem:** Missing API keys in `user-config.json`
**Solution:** API keys must be in `tokens/user-config.json`, not just `.env`

### 3. TTS Inworld 404 Error
**Problem:** Inworld API key not in user config
**Solution:** Add `INWORLD_API_KEY` to `tokens/user-config.json`

### 4. Commands Not Triggering
**Problem:** Commands are disabled by default
**Solution:** Enable at least one AI chat command

---

## Step-by-Step Setup

### Step 1: Copy Your Config Files
Your friend needs these files from YOUR working setup:

1. **Copy `.env` file** (contains all API keys)
2. **Copy `tokens/user-config.json`** (or create new one)

### Step 2: Create/Update `tokens/user-config.json`

Your friend needs to create this file with HIS information:

```json
{
  "TWITCH_BROADCASTER_USERNAME": "his_twitch_username",
  "NEXT_PUBLIC_TWITCH_BROADCASTER_USERNAME": "his_twitch_username",
  "NEXT_PUBLIC_DISCORD_LOG_CHANNEL_ID": "his_discord_channel_id",
  "NEXT_PUBLIC_DISCORD_AI_CHAT_CHANNEL_ID": "his_discord_channel_id",
  "NEXT_PUBLIC_DISCORD_SHOUTOUT_CHANNEL_ID": "his_discord_channel_id",
  "AI_PROVIDER": "edenai",
  "AI_MODEL": "openai/gpt-4o-mini",
  "EDENAI_API_KEY": "YOUR_EDENAI_KEY_HERE",
  "TTS_PROVIDER": "inworld",
  "TTS_VOICE": "Ashley",
  "INWORLD_API_KEY": "YOUR_INWORLD_KEY_HERE",
  "DISCORD_TTS_BRIDGE": "false",
  "AI_BOT_NAME": "Scarlett",
  "AI_PERSONALITY_NAME": "Commander"
}
```

**CRITICAL:** He needs to get his own API keys OR use yours temporarily:
- EdenAI API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjUyMzE5MjEtNzNkMy00ZmIzLThjODQtYzNkZTEzMTI1MjhlIiwidHlwZSI6ImFwaV90b2tlbiJ9.P4178M1mctgpseZeeXMswRRHYv-GbmpGc8ojyfaW47U`
- Inworld API Key: `aVRUekFPMWEydk5aQ0RWR2g1NnBmQm82bnRGZmUxOHI6eWo3T3dMNkJEWnJnWEVWVEZoWGN0WWFsWndJVzh6cXplVTdHYW5ZeWt0bEFqTHdLSTVQazJnYnJyMTR3cjd1bQ==`

### Step 3: Enable AI Chat Command

Open ONE of these files and set `"enabled": true`:
- `commands/Chat_Call_726c4151-cd69-40f9-9230-be89ccab47c9.json` ✅ (ALREADY ENABLED)
- `commands/athenacall_67ddf22f-8e2c-4e9a-963b-63424b5dc6a5.json`
- `commands/chat_call_bot_c33c0ff3-a81b-450c-a771-1ec9e9b37020.json`

**Only enable ONE command** to avoid conflicts.

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start the App

```bash
npm run dev
```

OR use the batch file:
```bash
start-streamweaver.bat
```

### Step 6: Configure in UI

1. Go to **Settings** page in the app
2. Verify API keys are loaded
3. Go to **Bot Functions** page
4. Set bot name to "Scarlett" (or whatever he wants)
5. Click **Save Changes**

---

## Debugging Common Issues

### Issue: "AI response failed"
**Check:**
1. Is `EDENAI_API_KEY` in `tokens/user-config.json`?
2. Is the API key valid?
3. Check console for actual error message

**Fix:**
```json
"EDENAI_API_KEY": "your_key_here"
```

### Issue: "Inworld TTS failed: 404"
**Check:**
1. Is `INWORLD_API_KEY` in `tokens/user-config.json`?
2. Is it the base64 encoded key?

**Fix:**
```json
"INWORLD_API_KEY": "base64_key_here"
```

### Issue: Bot name not triggering
**Check:**
1. Is a command enabled in `commands/` folder?
2. Is `AI_BOT_NAME` set in `tokens/user-config.json`?
3. Did he restart the app after enabling command?

**Fix:**
1. Enable `Chat_Call_726c4151-cd69-40f9-9230-be89ccab47c9.json`
2. Set `"AI_BOT_NAME": "Scarlett"` in config
3. Restart app

### Issue: "Infinite loop" on /tts-player
**This is NORMAL!** The TTS player polls every 500ms to check for new audio. It's not an error.

**Logs you'll see (NORMAL):**
```
GET /tts-player 200 in 283ms
GET /tts-player 200 in 309ms
GET /tts-player 200 in 311ms
```

This is the overlay checking for audio updates. Ignore it.

---

## Quick Test

After setup, test by typing in Twitch chat:
```
@Scarlett hello
```

**Expected:**
1. Bot responds with AI message
2. TTS plays (if configured)
3. No errors in console

**If it doesn't work:**
1. Check console for errors
2. Verify command is enabled
3. Verify API keys are in `user-config.json`
4. Restart the app

---

## Files Your Friend MUST Configure

1. ✅ `tokens/user-config.json` - API keys and bot name
2. ✅ `commands/Chat_Call_*.json` - Enable ONE command
3. ⚠️ `.env` - Optional, but good to have as backup

## Files That Are Already Fixed

1. ✅ `src/services/automation/CommandManager.ts` - Reads bot name dynamically
2. ✅ `src/app/api/bot-settings/route.ts` - Saves bot name to config
3. ✅ `src/app/api/config/route.ts` - Saves API keys to config
4. ✅ All command files use `{{BOT_NAME}}` placeholder

---

## Why It Works On Your Computer But Not His

1. **Your `.env` has all the keys** - His doesn't
2. **Your `user-config.json` has keys** - His is missing them
3. **Your commands are enabled** - His are disabled
4. **Your app has been running** - His is fresh install

The fix: He needs to copy your config files OR manually set everything up.

---

## Fastest Solution

**Option 1: Copy Your Files (5 minutes)**
1. Copy your `.env` to his repo
2. Copy your `tokens/user-config.json` to his repo
3. Update his username in the config
4. Run `npm install && npm run dev`

**Option 2: Manual Setup (15 minutes)**
1. Create `tokens/user-config.json` with all keys
2. Enable one command file
3. Set bot name in UI
4. Restart app

**Recommendation:** Use Option 1, then he can customize later.
