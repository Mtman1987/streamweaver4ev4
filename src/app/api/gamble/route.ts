import { NextRequest, NextResponse } from 'next/server';
import { handleRoll, handleYes, handleNo, handleGambleMode } from '@/services/gamble/space-mountain';
import { getUserPoints, updateUserPoints } from '@/services/points';

export async function POST(req: NextRequest) {
    try {
        const { command, user, wager, mode } = await req.json();
        
        if (!user) {
            return NextResponse.json({ error: 'User required' }, { status: 400 });
        }

        if (command === 'gamblemode') {
            if (!mode) {
                return NextResponse.json({ error: 'Mode required' }, { status: 400 });
            }
            await handleGambleMode(user, mode);
            return NextResponse.json({ success: true });
        }

        const userPoints = await getUserPoints(user);

        if (command === 'roll') {
            if (!wager || wager <= 0) {
                return NextResponse.json({ error: 'Valid wager required' }, { status: 400 });
            }
            
            const result = await handleRoll(user, wager, userPoints);
            if (result) {
                await updateUserPoints(user, userPoints + result.change);
            }
            return NextResponse.json({ success: true, result });
        }

        if (command === 'yes') {
            const result = await handleYes(user, userPoints);
            if (result) {
                await updateUserPoints(user, userPoints + result.change);
            }
            return NextResponse.json({ success: true, result });
        }

        if (command === 'no') {
            await handleNo(user);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
    } catch (error: any) {
        console.error('[Gamble API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
