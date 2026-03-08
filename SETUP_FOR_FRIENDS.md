# Quick Setup for Friends

## Step 1: Run Setup Script

Double-click `setup-for-friend.bat`

This will:
- Create `tokens/user-config.json` with API keys already filled in
- Enable the AI chat command
- Set bot name to "Scarlett"

## Step 2: Edit Your Info

Open `tokens/user-config.json` and change:
- `YOUR_TWITCH_USERNAME` → your actual Twitch username (2 places)
- `YOUR_DISCORD_CHANNEL_ID` → your Discord channel IDs (3 places)

**Leave everything else as-is!** The API keys are already configured.

## Step 3: Install & Run

```bash
npm install
npm run dev
```

## Step 4: Test

In Twitch chat, type:
```
@Scarlett hello
```

The bot should respond!

## Change Bot Name

1. Go to http://localhost:3100/bot-functions
2. Change "Bot Name" to whatever you want
3. Click "Save Changes"
4. Restart the app

Now it will respond to your new name instead of "Scarlett"

## Troubleshooting

**Bot doesn't respond:**
- Make sure you restarted the app after setup
- Check console for errors
- Verify `tokens/user-config.json` exists

**TTS doesn't work:**
- This is normal if you don't have OBS set up
- The bot will still respond in chat

**"Infinite loop" messages:**
- This is normal! It's just the TTS player checking for audio
- Ignore the `GET /tts-player 200` messages

## Need Help?

Check `FRIEND_SETUP_CHECKLIST.md` for detailed troubleshooting.
