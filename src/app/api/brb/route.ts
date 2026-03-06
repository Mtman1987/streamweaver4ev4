import { NextRequest, NextResponse } from 'next/server';
import { startBRB, stopBRB, toggleClipMode, getClipMode } from '@/services/brb-clips';
import { getStoredTokens } from '@/lib/token-utils.server';
import { setupObsWebSocket } from '@/services/obs';

export async function POST(req: NextRequest) {
    try {
        const { action } = await req.json();
        
        if (action === 'start') {
            // Ensure OBS is connected
            await setupObsWebSocket();
            
            const tokens = await getStoredTokens();
            if (!tokens?.broadcasterUsername) {
                return NextResponse.json({ error: 'Broadcaster username not found' }, { status: 400 });
            }
            
            await startBRB(tokens.broadcasterUsername);
            return NextResponse.json({ success: true, message: 'BRB started' });
        }
        
        if (action === 'stop') {
            stopBRB();
            return NextResponse.json({ success: true, message: 'BRB stopped' });
        }
        
        if (action === 'toggle-mode') {
            toggleClipMode();
            const mode = getClipMode();
            return NextResponse.json({ success: true, mode });
        }
        
        if (action === 'get-mode') {
            const mode = getClipMode();
            return NextResponse.json({ success: true, mode });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[BRB API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
