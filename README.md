# StreamWeaver (Local Desktop App)

StreamWeaver is a **local-first streaming command center**: a Next.js dashboard + a local Node automation server (and optional Electron wrapper) that helps run stream automations and integrations.

This repo is currently optimized for **running locally on your streaming PC** (Windows) using the provided start/stop scripts.

## What It Runs

- **Dashboard UI** (Next.js) on `http://localhost:3100`
- **Automation / WebSocket server** (`server.ts`) on `ws://127.0.0.1:8090`
- Optional: **Electron tray app** that opens the dashboard in a window

## Quick Start (Windows)

### 1) Install

- Install **Node.js (LTS)**
- Download this project (zip or git clone)
- In the project folder:

```powershell
npm install
```

### 2) Configure environment

1. Copy `.env.example` to `.env`
2. Fill in the keys you plan to use (start minimal; you can add later).

Important notes:

- `.env` is intentionally local-only and should not be committed.
- Some values are not kept in `.env` anymore and are instead collected on first run.

### 3) Run

Run:

```powershell
./start-streamweaver.bat
```

Then open:

- Dashboard: `http://localhost:3100`

To stop:

```powershell
./stop-streamweaver.bat
```

## First-time Setup (in-app)

On first run, StreamWeaver will prompt for user-specific values (e.g. your Twitch channel name). These are stored locally in:

- `tokens/user-config.json`

This avoids having end users edit config files manually.

## Integrations

### Twitch (OAuth)

The app uses Twitch OAuth flows for user access. You’ll need at minimum:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- matching `NEXT_PUBLIC_TWITCH_CLIENT_ID`

Tokens are stored locally under `tokens/`.

### Discord

There are two categories of Discord actions:

1. **User OAuth actions** (user-level, limited)

- Useful for basic identity/authorization and user-scoped features.

1. **Bot actions** (posting/reading/deleting messages, uploading files)

- These require a **Discord bot token** (`DISCORD_BOT_TOKEN`) in the current local-first setup.

#### Future option: Hosted Discord “Broker”

To avoid shipping/embedding a bot token on user machines, the Discord bot actions are now centralized behind a single entrypoint.

- By default, the app calls Discord directly using `DISCORD_BOT_TOKEN`.
- Later, you can switch to a hosted broker service (Cloud Run / Functions) by setting:
  - `DISCORD_BROKER_URL`
  - `DISCORD_BROKER_API_KEY` (optional)

When enabled, StreamWeaver will call your broker instead of needing the bot token locally.

### OBS

OBS control uses OBS WebSocket (default: `127.0.0.1:4455`). Cloud-hosted backends can’t reach a user’s local OBS; this is why StreamWeaver is designed to run locally.

## Security Model (Practical)

- Treat **anything shipped inside a desktop app** as discoverable.
- Do not embed long-lived shared secrets (Discord bot token, provider API keys you don’t want exposed) in a distributed build.
- Prefer:
  - user OAuth tokens stored locally, and/or
  - a small hosted broker for privileged actions.

### Optional: Hosted Broker (single switch)

StreamWeaver can run in a local-first mode today (secrets in `.env`), and later switch to a hosted broker by setting a single value:

- Set `BROKER_BASE_URL` (example: `https://your-broker.example.com`)

When `BROKER_BASE_URL` is set, these routes will forward to the broker instead of using local machine secrets:

- `POST /api/ai/generate` (Gemini)
- `POST /api/google-tts` (Google Cloud TTS)
- `POST /api/tts` (ElevenLabs)
- Speech-to-Text (Google Cloud STT) calls will forward to `POST {BROKER_BASE_URL}/v1/speech-to-text`

This lets you keep the app working as-is during development, and later flip to hosted without changing client code.

## Common Troubleshooting

- **Ports already in use**: StreamWeaver uses `3100` (dashboard) and `8090` (WS). Close other apps using these ports.
- **Twitch OAuth redirect mismatch**: Ensure your Twitch app redirect URIs match what you’re using locally.
- **Discord bot errors**:
  - Bot must be in the server.
  - Channel IDs must be correct.
  - `DISCORD_BOT_TOKEN` must be set if you are not using a broker.
- **Google Speech/TTS credential errors**:
  - Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key JSON path (recommended), or set `GOOGLE_SERVICE_ACCOUNT_JSON`.
  - On Windows, avoid a leading `/...` path (it resolves to the drive root). Prefer an absolute path like `C:\\...\\key.json` or a project-relative path like `./key.json`.

## Developer Notes

Useful scripts:

- `npm run dev` (runs Next + WS + Genkit tooling)
- `npm run dev:ws` (runs only the WS server)
- `npm run dev:next` (runs only the dashboard)
- `npm run electron:dev` (runs the Electron wrapper)
- `npm run electron:pack` (builds an installer via electron-builder)

---

If you want, tell me your intended distribution method (GitHub Releases vs website), and I can tune this README for end users (download/install steps, screenshots placeholders, and a minimal “what you need to configure” checklist).
