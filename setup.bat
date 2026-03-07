@echo off
echo Setting up StreamWeaver...

REM Copy example files if they don't exist
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
)

if not exist "tokens\user-config.json" (
    echo Creating tokens\user-config.json from example...
    copy tokens\user-config.example.json tokens\user-config.json
)

if not exist "tokens\discord-webhooks.json" (
    echo Creating tokens\discord-webhooks.json...
    copy tokens\discord-webhooks.example.json tokens\discord-webhooks.json
)

if not exist "tokens\twitch-tokens.json" (
    echo Creating tokens\twitch-tokens.json...
    copy tokens\twitch-tokens.example.json tokens\twitch-tokens.json
)

if not exist "tokens\discord-channels.json" (
    echo Creating tokens\discord-channels.json...
    copy tokens\discord-channels.example.json tokens\discord-channels.json
)

if not exist "tokens\welcome-wagon.json" (
    echo Creating tokens\welcome-wagon.json...
    copy tokens\welcome-wagon.example.json tokens\welcome-wagon.json
)

echo.
echo Setup complete! Now run:
echo   npm install
echo   npm run dev
echo.
echo Don't forget to configure your .env and tokens\user-config.json files!
pause
