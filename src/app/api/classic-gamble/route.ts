import { NextRequest, NextResponse } from 'next/server';
import { handleGamble, getSettings, updateSettings } from '@/services/gamble/classic-gamble';
import { getUserPoints, updateUserPoints } from '@/services/points';

export async function POST(req: NextRequest) {
    try {
        const { action, user, betInput, settings: newSettings } = await req.json();
        
        if (action === 'get-settings') {
            const settings = getSettings();
            return NextResponse.json({ success: true, settings });
        }
        
        if (action === 'update-settings') {
            if (!newSettings) {
                return NextResponse.json({ error: 'Settings required' }, { status: 400 });
            }
            await updateSettings(newSettings);
            return NextResponse.json({ success: true });
        }
        
        if (action === 'gamble') {
            if (!user) {
                return NextResponse.json({ error: 'User required' }, { status: 400 });
            }
            
            const userPoints = await getUserPoints(user);
            const result = await handleGamble(user, betInput || '', userPoints);
            
            if (result) {
                await updateUserPoints(user, result.newTotal);
                return NextResponse.json({ success: true, result });
            }
            
            return NextResponse.json({ success: false });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[Classic Gamble API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const settings = getSettings();
        return NextResponse.json({ success: true, settings });
    } catch (error: any) {
        console.error('[Classic Gamble API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
