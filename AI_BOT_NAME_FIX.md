# AI Bot Name Fix - Scarlett Issue

## Problem
When your friend downloaded the repo and saved his bot with the name "Scarlett", the AI wasn't being triggered. When he typed "Athena" (your bot name), it sent "AI response failed".

## Root Causes

### 1. Missing Bot Name Configuration
The `tokens/user-config.json` file was missing the `AI_BOT_NAME` field. Without this, the system defaults to "AI Bot" instead of using the custom bot name.

**Location:** `tokens/user-config.json`

### 2. Hardcoded Command Pattern
The chat command that triggers the AI was hardcoded to look for "Annie" instead of dynamically using the bot name from the configuration.

**Location:** `commands/athenacall_67ddf22f-8e2c-4e9a-963b-63424b5dc6a5.json`
- Old pattern: `(?i).*@?Annie.*`
- This regex only matched messages containing "Annie"

## How the System Works

1. **User Config** (`tokens/user-config.json`):
   - Stores the bot name in `AI_BOT_NAME` field
   - Stores personality name in `AI_PERSONALITY_NAME` field

2. **AI Provider** (`src/services/ai-provider.ts`):
   - Reads `AI_BOT_NAME` from user config
   - Falls back to "AI Bot" if not set
   - Uses this name in AI responses and system prompts

3. **Command Trigger** (`commands/athenacall_*.json`):
   - Uses regex pattern to detect when users mention the bot
   - Pattern: `(?i).*@?BotName.*` (case-insensitive, matches @BotName or BotName anywhere in message)

4. **Chat API** (`src/app/api/ai/chat-with-memory/route.ts`):
   - Receives the message
   - Gets bot name from `getAIConfig().botName`
   - Generates AI response
   - Removes bot name prefix from response

## Fixes Applied

### Fix 1: Added Bot Name to User Config
```json
{
  "AI_BOT_NAME": "Scarlett",
  "AI_PERSONALITY_NAME": "Commander"
}
```

### Fix 2: Updated Command Pattern
Changed the regex pattern from `(?i).*@?Annie.*` to `(?i).*@?Scarlett.*`

## For Your Friend to Use

Your friend needs to:

1. **Add API key to user config:**
   - Open `tokens/user-config.json`
   - Add this line:
     ```json
     "EDENAI_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjUyMzE5MjEtNzNkMy00ZmIzLThjODQtYzNkZTEzMTI1MjhlIiwidHlwZSI6ImFwaV90b2tlbiJ9.P4178M1mctgpseZeeXMswRRHYv-GbmpGc8ojyfaW47U"
     ```

2. **Set their bot name in user config:**
   - In the same file, add:
     ```json
     "AI_BOT_NAME": "Scarlett",
     "AI_PERSONALITY_NAME": "Commander"
     ```

3. **Update ALL command patterns:**
   - Open `commands/athenacall_67ddf22f-8e2c-4e9a-963b-63424b5dc6a5.json`
   - Change: `"command": "(?i).*@?Scarlett.*"`
   - Open `commands/Chat_Call_726c4151-cd69-40f9-9230-be89ccab47c9.json`
   - Change: `"command": "(?i).*@?Scarlett.*"`
   - Open `commands/chat_call_bot_c33c0ff3-a81b-450c-a771-1ec9e9b37020.json`
   - Change: `"command": "(?i).*@?Scarlett.*"`

4. **Enable the correct command:**
   - Choose ONE command file to enable
   - Set `"enabled": true` in that file
   - Make sure others are `"enabled": false`

5. **Restart the application** for changes to take effect

## Why "Athena" Caused "AI Response Failed"

When your friend typed "Athena":
1. There's a command `Chat_Call_726c4151-cd69-40f9-9230-be89ccab47c9.json` with pattern `(?i).*@?Athena.*`
2. If this command is enabled, it triggers the AI
3. The AI tries to generate a response using the configured provider (edenai)
4. **The problem:** `user-config.json` doesn't have `EDENAI_API_KEY`, so the API call fails
5. The AI provider returns the fallback message: "AI response failed"

**Root cause:** Missing `EDENAI_API_KEY` in `tokens/user-config.json`

## Making It Dynamic (Future Improvement)

To make this truly dynamic so users don't have to manually edit the command file:

1. **Option A:** Generate command pattern from config on startup
2. **Option B:** Use a wildcard pattern and validate bot name in the handler
3. **Option C:** Create a UI setting that updates both config and command files

### Recommended: Option B Implementation

Modify the command to use a generic pattern and check the bot name in the API handler:

**Command pattern:** `(?i).*@?\w+.*` (matches any @mention)

**API handler check:**
```typescript
const aiConfig = getAIConfig();
const botNamePattern = new RegExp(`@?${aiConfig.botName}`, 'i');
if (!botNamePattern.test(message)) {
  return; // Not for this bot
}
```

This way, the bot name only needs to be set in one place: `user-config.json`

## Testing

After applying fixes, test with:
1. `@Scarlett hello` - Should trigger AI response
2. `Hey Scarlett, how are you?` - Should trigger AI response
3. `Scarlett` - Should trigger AI response
4. `@Athena hello` - Should NOT trigger (unless Athena is the bot name)

## Files Modified

1. `tokens/user-config.json` - Added AI_BOT_NAME and AI_PERSONALITY_NAME
2. `commands/athenacall_67ddf22f-8e2c-4e9a-963b-63424b5dc6a5.json` - Updated regex pattern
