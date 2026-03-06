import { NextRequest, NextResponse } from 'next/server';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  try {
    const guildId = params.guildId;
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 500 });

    const url = (path: string) => `${DISCORD_API_BASE}${path}`;

    // membersLimit query param (default 100)
    const qp = Object.fromEntries(request.nextUrl.searchParams.entries());
    const membersLimit = Math.min(parseInt(qp.membersLimit || '100', 10) || 100, 1000);

    const headers = {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'StreamWeaver-Bot (1.0)'
    } as Record<string,string>;

    // Fetch channels
    const [channelsRes, rolesRes, membersRes] = await Promise.all([
      fetch(url(`/guilds/${guildId}/channels`), { headers }),
      fetch(url(`/guilds/${guildId}/roles`), { headers }),
      fetch(url(`/guilds/${guildId}/members?limit=${membersLimit}`), { headers }),
    ]);

    if (!channelsRes.ok) {
      const txt = await channelsRes.text().catch(() => '');
      return NextResponse.json({ error: `Failed to fetch channels: ${channelsRes.status} ${txt}` }, { status: 502 });
    }
    if (!rolesRes.ok) {
      const txt = await rolesRes.text().catch(() => '');
      return NextResponse.json({ error: `Failed to fetch roles: ${rolesRes.status} ${txt}` }, { status: 502 });
    }

    const channels = await channelsRes.json();
    const roles = await rolesRes.json();

    let members: any[] = [];
    if (membersRes.ok) {
      members = await membersRes.json();
    } else {
      // Members may be restricted by intents; return empty array and surface a message
      const txt = await membersRes.text().catch(() => '');
      console.warn('[Discord] guild members fetch failed:', membersRes.status, txt);
    }

    return NextResponse.json({ guildId, channels, roles, members, membersLimit });
  } catch (error: any) {
    console.error('Error in /api/discord/guilds/[guildId]:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
