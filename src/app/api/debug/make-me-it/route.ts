import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const statsFile = path.join(process.cwd(), 'data', 'tag-stats.json');
    const data = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    
    const mtman = data.players.find((p: any) => p.username.toLowerCase() === 'mtman1987');
    if (!mtman) {
      return NextResponse.json({ error: 'mtman1987 not found' }, { status: 404 });
    }
    
    data.currentIt = mtman.id;
    data.immunity = {};
    data.lastUpdate = Date.now();
    fs.writeFileSync(statsFile, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const statsFile = path.join(process.cwd(), 'data', 'tag-stats.json');
    
    let data;
    try {
      data = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch (fileError: any) {
      console.error('[Trigger Timeout] File read error:', fileError.message);
      return NextResponse.json({ error: 'Failed to read files: ' + fileError.message }, { status: 500 });
    }
    
    const currentIt = data.players.find((p: any) => p.id === data.currentIt);
    
    // Set player as offline/away with immunity
    if (currentIt && !data.immunity) data.immunity = {};
    if (currentIt) {
      data.immunity[`${currentIt.id}_offline`] = true;
    }
    
    // Set to FREE FOR ALL mode
    data.currentIt = null;
    data.lastUpdate = Date.now();
    data.tags.push({
      from: 'system',
      to: 'free-for-all',
      timestamp: Date.now(),
      channel: 'manual-timeout'
    });
    
    fs.writeFileSync(statsFile, JSON.stringify(data, null, 2));
    
    const announcement = `🔥 FREE FOR ALL! ${currentIt?.username || 'Someone'} timed out. Anyone can tag for DOUBLE POINTS! 🔥`;
    
    try {
      await fetch('http://127.0.0.1:8090/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tag-announcement', message: announcement })
      });
    } catch (err) {
      console.error('[Trigger Timeout] Broadcast failed:', err);
    }
    
    return NextResponse.json({ success: true, previousIt: currentIt?.username, announcement });
  } catch (error: any) {
    console.error('[Trigger Timeout] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
