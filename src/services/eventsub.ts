import { TIMEOUTS } from '../constants';
import { WebSocket } from 'ws';
import { getStoredTokens, ensureValidToken } from '../lib/token-utils.server';
import { getPartnerById } from './partner-checkin';
import { sendChatMessage } from './twitch';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

interface CheckinTemplates {
    broadcasterOpenings: string[];
    botGreetings: string[];
}

function loadCheckinTemplates(): CheckinTemplates {
    try {
        const templatesPath = path.join(process.cwd(), 'Partner Check Ins', 'templates.json');
        const content = fs.readFileSync(templatesPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('[Partner Checkin] Failed to load templates:', error);
        // Return default templates
        return {
            broadcasterOpenings: ["{partner} just checked in!"],
            botGreetings: ["Welcome {partner}! Thanks for checking in!"]
        };
    }
}

function randomItem<T>(arr: T[]): T {
    if (!arr || arr.length === 0) {
        throw new Error('Array is empty or undefined');
    }
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateBroadcasterMessage(partnerName: string, discordLink: string, templates: CheckinTemplates): string {
    const message = randomItem(templates.broadcasterOpenings).replace('{partner}', partnerName);
    return `${message} ${discordLink}`;
}

function generateBotMessage(partnerName: string, templates: CheckinTemplates): string {
    return randomItem(templates.botGreetings).replace('{partner}', partnerName);
}

let eventSubSocket: WebSocket | null = null;
let eventSubReconnectTimeout: NodeJS.Timeout | null = null;

// Track recent chat messages for redemptions that require chat input
const recentChatMessages = new Map<string, { message: string; timestamp: number }>();

import { getConfigValue } from '../lib/app-config';

async function getBroadcasterAuth(): Promise<{ clientId: string; accessToken: string; broadcasterId: string } | null> {
    // Get tokens from OAuth (not env)
    const tokens = await getStoredTokens();
    if (!tokens) {
        console.warn('[EventSub] No OAuth tokens found - please authenticate via dashboard');
        return null;
    }

    // Use client ID from tokens, not env
    const clientId = tokens.twitchClientId || process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET; // Only keep secret in env
    
    if (!clientId || !clientSecret) {
        console.warn('[EventSub] Missing credentials - clientId:', !!clientId, 'clientSecret:', !!clientSecret);
        return null;
    }

    const accessToken = await ensureValidToken(clientId, clientSecret, 'broadcaster', tokens);
    
    // Get broadcaster ID from token validation
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        console.warn('[EventSub] Token validation failed');
        return null;
    }
    const data = await res.json();
    const broadcasterId = data.user_id;
    
    if (!broadcasterId) {
        console.warn('[EventSub] No user_id in token validation');
        return null;
    }
    
    return { clientId, accessToken, broadcasterId };
}

async function getBroadcasterTokenScopes(auth: { accessToken: string }): Promise<string[] | null> {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.scopes) ? data.scopes : [];
}

async function deleteExistingChannelPointSubscriptions(auth: { clientId: string; accessToken: string; broadcasterId: string }): Promise<void> {
    try {
        const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions?first=100', {
            headers: {
                'Client-ID': auth.clientId,
                Authorization: `Bearer ${auth.accessToken}`,
            },
        });
        if (!res.ok) {
            const text = await res.text();
            console.warn('[EventSub] Failed to list subscriptions:', res.status, text);
            return;
        }
        const data = await res.json();
        const subs = Array.isArray(data?.data) ? data.data : [];
        const matches = subs.filter((s: any) =>
            s?.type === 'channel.channel_points_custom_reward_redemption.add' &&
            String(s?.condition?.broadcaster_user_id || '') === String(auth.broadcasterId)
        );

        for (const sub of matches) {
            const id = String(sub?.id || '');
            if (!id) continue;
            const del = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: {
                    'Client-ID': auth.clientId,
                    Authorization: `Bearer ${auth.accessToken}`,
                },
            });
            if (del.ok) {
                console.log('[EventSub] Deleted old channel point subscription:', id);
            } else {
                const text = await del.text();
                console.warn('[EventSub] Failed to delete subscription:', id, del.status, text);
            }
        }
    } catch (error) {
        console.warn('[EventSub] Error deleting old subscriptions:', error);
    }
}

async function createChannelPointSubscription(auth: { clientId: string; accessToken: string; broadcasterId: string }, sessionId: string): Promise<void> {
    const body = {
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: {
            broadcaster_user_id: auth.broadcasterId,
        },
        transport: {
            method: 'websocket',
            session_id: sessionId,
        },
    };

    console.log('[EventSub] Creating subscription with body:', JSON.stringify(body, null, 2));

    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Client-ID': auth.clientId,
            Authorization: `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        console.warn('[EventSub] Failed to create channel point subscription:', res.status, text);
        return;
    }

    const data = await res.json().catch(() => null);
    const createdId = data?.data?.[0]?.id;
    console.log('[EventSub] Channel point subscription created:', createdId || '(unknown id)', 'Response:', JSON.stringify(data, null, 2));
}

export async function logBroadcasterTokenScopes(): Promise<void> {
    try {
        const auth = await getBroadcasterAuth();
        if (!auth) return;
        const scopes = await getBroadcasterTokenScopes(auth);
        if (!scopes) {
            console.warn('[EventSub] Token validate failed');
            return;
        }
        console.log('[EventSub] Broadcaster token scopes:', scopes.join(', ') || '(none)');
    } catch (error) {
        console.warn('[EventSub] Failed to validate token scopes:', error);
    }
}

export async function startEventSub(url = 'wss://eventsub.wss.twitch.tv/ws'): Promise<void> {
    if (eventSubSocket) {
        try { eventSubSocket.close(); } catch { /* ignore */ }
        eventSubSocket = null;
    }

    const auth = await getBroadcasterAuth();
    if (!auth) return;

    const scopes = await getBroadcasterTokenScopes(auth);
    if (!scopes) {
        console.warn('[EventSub] Cannot validate broadcaster token');
        return;
    }
    
    const hasRedemptionsScope = scopes.includes('channel:read:redemptions') || scopes.includes('channel:manage:redemptions');
    if (!hasRedemptionsScope) {
        console.warn('[EventSub] Missing channel point scope');
        return;
    }

    console.log('[EventSub] Connecting:', url);
    eventSubSocket = new WebSocket(url);

    eventSubSocket.on('open', () => {
        console.log('[EventSub] Socket open');
    });

    eventSubSocket.on('close', (code, reason) => {
        console.warn('[EventSub] Socket closed:', code, reason?.toString?.() || '');
        scheduleEventSubReconnect('wss://eventsub.wss.twitch.tv/ws', 3000);
    });

    eventSubSocket.on('error', (err) => {
        console.warn('[EventSub] Socket error:', err);
    });

    eventSubSocket.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            const messageType = msg?.metadata?.message_type;

            if (messageType === 'session_welcome') {
                const sessionId = msg?.payload?.session?.id;
                if (!sessionId) return;
                console.log('[EventSub] Session established:', sessionId);
                
                // Clean up old subscriptions and create new one
                await deleteExistingChannelPointSubscriptions(auth);
                await createChannelPointSubscription(auth, sessionId);
                return;
            }

            if (messageType === 'session_reconnect') {
                const reconnectUrl = msg?.payload?.session?.reconnect_url;
                if (typeof reconnectUrl === 'string' && reconnectUrl.startsWith('wss://')) {
                    console.log('[EventSub] Reconnect requested');
                    scheduleEventSubReconnect(reconnectUrl, 500);
                }
                return;
            }

            if (messageType === 'notification') {
                const subType = msg?.payload?.subscription?.type;
                if (subType === 'channel.channel_points_custom_reward_redemption.add') {
                    const event = msg?.payload?.event;
                    if (event) {
                        // Log the full event for debugging
                        console.log('[EventSub] Full event data:', JSON.stringify(event, null, 2));
                        
                        const rewardTitle = String(event?.reward?.title || '');
                        const userLogin = String(event?.user_login || '');
                        const userInput = String(event?.user_input || '').trim();
                        console.log(`[EventSub] Channel point redeem: ${rewardTitle} by ${userLogin}, input: "${userInput}"`);
                        
                        // Handle Partner Check Ins
                        if (rewardTitle.toLowerCase().includes('partner check')) {
                            // Check for recent chat message from this user
                            const recentMsg = recentChatMessages.get(userLogin.toLowerCase());
                            const now = Date.now();
                            
                            let squareNum: number | null = null;
                            
                            if (recentMsg && (now - recentMsg.timestamp) < 5000) {
                                // Use recent chat message within 5 seconds
                                squareNum = parseInt(recentMsg.message.trim(), 10);
                                recentChatMessages.delete(userLogin.toLowerCase());
                            } else if (userInput) {
                                // Use text input if provided
                                squareNum = parseInt(userInput, 10);
                            }
                            
                            if (!squareNum || isNaN(squareNum) || squareNum < 1 || squareNum > 16) {
                                console.log(`[EventSub] Invalid square number for ${userLogin}: ${squareNum}`);
                                const { sendChatMessage } = require('./twitch');
                                sendChatMessage(`@${userLogin}, please use a number between 1-16 for partner check-in.`, 'bot').catch(() => {});
                                return;
                            }
                            
                            console.log(`[EventSub] Partner check-in: ${userLogin} selected square ${squareNum}`);
                            
                            // Execute all partner check-in actions
                            handlePartnerCheckin(userLogin, squareNum).catch(err => {
                                console.error('[EventSub] Partner check-in handler error:', err);
                            });
                        }
                        
                        // Handle Pokemon pack redemptions
                        if (rewardTitle.toLowerCase().includes('pokepack')) {
                            const setNumber = parseInt(userInput, 10);
                            if (setNumber >= 1 && setNumber <= 6) {
                                try {
                                    const { openPack } = require('./pokemon-packs');
                                    const { addCards, getUser, updateUser } = require('./user-stats');
                                    const PACK_COST = 1500;
                                    
                                    const user = getUser(userLogin);
                                    
                                    // Check if user has enough points
                                    if (user.points < PACK_COST) {
                                        console.log(`[EventSub] ${userLogin} doesn't have enough points (${user.points}/${PACK_COST})`);
                                        return;
                                    }
                                    
                                    // Deduct points
                                    updateUser(userLogin, { points: user.points - PACK_COST });
                                    
                                    const result = openPack(setNumber, userLogin);
                                    if (result && (global as any).broadcast) {
                                        // Track cards in user stats
                                        addCards(userLogin, result.pack);
                                        
                                        (global as any).broadcast({
                                            type: 'pokemon-pack-opened',
                                            payload: result
                                        });
                                        
                                        console.log(`[EventSub] ${userLogin} spent ${PACK_COST} points, now has ${user.points - PACK_COST}`);
                                    }
                                } catch (error) {
                                    console.error('[EventSub] Pokemon pack error:', error);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('[EventSub] Failed to process message:', error);
        }
    });
}

function scheduleEventSubReconnect(url: string, delayMs = 2000) {
    if (eventSubReconnectTimeout) return;
    
    // Exponential backoff with max delay
    const maxDelay = TIMEOUTS.RECONNECT_MAX_DELAY;
    const actualDelay = Math.min(delayMs < TIMEOUTS.RECONNECT_MIN_DELAY ? TIMEOUTS.RECONNECT_MIN_DELAY : delayMs, maxDelay);
    
    eventSubReconnectTimeout = setTimeout(() => {
        eventSubReconnectTimeout = null;
        void startEventSub(url);
    }, actualDelay);
    
    console.log(`[EventSub] Scheduled reconnect in ${actualDelay}ms`);
}

// Export function to track chat messages for redemptions
export function trackChatMessageForRedemption(username: string, message: string): void {
    recentChatMessages.set(username.toLowerCase(), {
        message,
        timestamp: Date.now()
    });
    
    // Clean up old messages after 10 seconds
    setTimeout(() => {
        const entry = recentChatMessages.get(username.toLowerCase());
        if (entry && Date.now() - entry.timestamp > 10000) {
            recentChatMessages.delete(username.toLowerCase());
        }
    }, 10000);
}

// Handle partner check-in with all integrations
async function handlePartnerCheckin(username: string, squareNum: number): Promise<void> {
    console.log(`[Partner Checkin] START: ${username} -> square ${squareNum}`);
    
    try {
        const partner = getPartnerById(squareNum);
        if (!partner) {
            console.error(`[Partner Checkin] Partner ${squareNum} not found`);
            return;
        }

        console.log(`[Partner Checkin] Found partner: ${partner.name}`);
        
        // Use Twitch profile image instead of local file
        const partnerImageUrl = `https://static-cdn.jtvnw.net/jtv_user_pictures/${partner.name.toLowerCase()}-profile_image-300x300.png`;

        // Load templates and generate messages
        const templates = loadCheckinTemplates();
        const broadcasterMsg = generateBroadcasterMessage(partner.name, partner.discordLink, templates);
        const botMsg = generateBotMessage(partner.name, templates);

        // 1. Broadcaster posts to Twitch chat
        console.log('[Partner Checkin] Sending broadcaster message...');
        await sendChatMessage(broadcasterMsg, 'broadcaster');
        console.log('[Partner Checkin] Broadcaster message sent');

        // 2. Bot (Athena) posts welcome message
        console.log('[Partner Checkin] Sending bot message...');
        await sendChatMessage(botMsg, 'bot');
        console.log('[Partner Checkin] Bot message sent');

        // 3. Trigger TTS
        console.log('[Partner Checkin] Triggering TTS...');
        try {
            const { textToSpeech } = await import('../ai/flows/text-to-speech');
            const ttsResult = await textToSpeech({ text: botMsg, voice: 'Algieba' });
            
            if (ttsResult.audioDataUri) {
                const useTTSPlayer = process.env.USE_TTS_PLAYER !== 'false';
                
                if (useTTSPlayer) {
                    await fetch('http://127.0.0.1:3100/api/tts/current', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audioUrl: ttsResult.audioDataUri })
                    }).catch(() => {});
                }
            }
        } catch (error) {
            console.error('[Partner Checkin] TTS error:', error);
        }

        // 4. Show partner image in OBS via WebSocket broadcast
        console.log('[Partner Checkin] Broadcasting to WebSocket clients...');

        // 5. Send Discord notification
        console.log('[Partner Checkin] Sending Discord notification...');
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🎉 **${partner.name}** just checked in on stream!\nJoin their Discord: ${partner.discordLink}`
                })
            }).catch(err => console.error('[Partner Checkin] Discord error:', err));
        }

        // Broadcast to WebSocket clients
        if ((global as any).broadcast) {
            (global as any).broadcast({
                type: 'partner-checkin',
                payload: { username, square: squareNum, partner: { ...partner, imageUrl: partnerImageUrl } }
            });
        }

        console.log(`[Partner Checkin] COMPLETE: ${partner.name}`);
    } catch (error) {
        console.error('[Partner Checkin] FATAL ERROR:', error);
    }
}