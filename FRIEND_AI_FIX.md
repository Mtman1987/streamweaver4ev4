# StreamWeaver Setup Issues - FIXES

## Issue 1: Bot Name "Scarlett" Not Triggering

**Problem**: Saying "Scarlett" in chat doesn't trigger the AI bot

**Root Cause**: The bot name is set in `tokens/user-config.json` but the system needs to be restarted after changing it.

**Fix**:
1. Open `tokens/user-config.json`
2. Verify `AI_BOT_NAME` is set to `"Scarlett"` (or whatever name you want)
3. **RESTART StreamWeaver** - Close the window and run `start-streamweaver.bat` again
4. Test by saying "Scarlett" or "hey Scarlett" in Twitch chat

## Issue 2: "AI response failed" Error

**Problem**: Bot responds with "AI response failed" when mentioned

**Root Cause**: Missing AI API key in user-config.json

**Fix - Choose ONE of these options**:

### Option A: Google Gemini (FREE - RECOMMENDED)
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key
4. Open `tokens/user-config.json`
5. Add/update these lines:
```json
{
  "AI_PROVIDER": "gemini",
  "GEMINI_API_KEY": "YOUR_KEY_HERE",
  "AI_MODEL": "gemini-2.0-flash"
}
```

### Option B: EdenAI
1. Sign up at https://www.edenai.co/
2. Get your API key from dashboard
3. Open `tokens/user-config.json`
4. Add/update these lines:
```json
{
  "AI_PROVIDER": "edenai",
  "EDENAI_API_KEY": "YOUR_KEY_HERE",
  "AI_MODEL": "openai/gpt-4o-mini"
}
```

### Option C: OpenAI
1. Sign up at https://platform.openai.com/
2. Get your API key
3. Open `tokens/user-config.json`
4. Add/update these lines:
```json
{
  "AI_PROVIDER": "openai",
  "OPENAI_API_KEY": "YOUR_KEY_HERE",
  "AI_MODEL": "gpt-4o-mini"
}
```

## Complete user-config.json Example

```json
{
  "TWITCH_BROADCASTER_USERNAME": "fatkid4ev4",
  "TWITCH_BOT_USERNAME": "scarlett_ai420",
  "AI_BOT_NAME": "Scarlett",
  "AI_PERSONALITY_NAME": "Commander",
  "AI_PROVIDER": "gemini",
  "GEMINI_API_KEY": "YOUR_GEMINI_KEY_HERE",
  "AI_MODEL": "gemini-2.0-flash",
  "INWORLD_API_KEY": "YOUR_INWORLD_KEY_FOR_TTS",
  "INWORLD_WORKSPACE_NAME": "your-workspace"
}
```

## Testing

1. Restart StreamWeaver after making changes
2. Say "Scarlett" in Twitch chat
3. Bot should respond with actual AI-generated message (not "AI response failed")

## Still Not Working?

Check the console logs for:
- `[AI Chat Memory] AI returned empty response` - means API key is invalid
- `[Dispatcher] Scarlett mentioned by USERNAME` - means bot name detection is working
- `[AI Chat Memory] Successfully saved messages` - means the API call succeeded

If you see "AI response failed", your API key is missing or invalid.
