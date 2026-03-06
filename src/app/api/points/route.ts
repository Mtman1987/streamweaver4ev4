import { NextRequest, NextResponse } from 'next/server';
import { getPoints, addPoints, setPoints, getLeaderboard, addPointsToAll, setPointsToAll, resetAllPoints } from '@/services/points';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit');

  try {
    if (action === 'leaderboard') {
      const leaderboard = await getLeaderboard(limit ? parseInt(limit) : 10);
      return NextResponse.json({ leaderboard });
    }

    if (action === 'get' && userId) {
      const userPoints = await getPoints(userId);
      return NextResponse.json({ userId, ...userPoints });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Points API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, amount, value, username, points, reason, target } = body;

    // Backwards-compatible: accept { username, points } payloads from UI
    if (!action && username && typeof points === 'number') {
      const result = await addPoints(username, points, reason || 'ui action');
      return NextResponse.json({ userId: username, ...result });
    }

    if (action === 'add') {
      const targetUser = target || userId;
      if (!targetUser || typeof amount !== 'number') {
        return NextResponse.json({ error: 'userId/target and amount required' }, { status: 400 });
      }
      const result = await addPoints(targetUser, amount, 'manual add');
      return NextResponse.json({ userId: targetUser, ...result });
    }

    if (action === 'set') {
      const targetUser = target || userId;
      if (!targetUser || typeof value !== 'number') {
        return NextResponse.json({ error: 'userId/target and value required' }, { status: 400 });
      }
      const result = await setPoints(targetUser, value);
      return NextResponse.json({ userId: targetUser, ...result });
    }

    if (action === 'addToAll') {
      if (typeof amount !== 'number') {
        return NextResponse.json({ error: 'amount required' }, { status: 400 });
      }
      const count = await addPointsToAll(amount);
      return NextResponse.json({ count, amount });
    }

    if (action === 'setToAll') {
      if (typeof amount !== 'number') {
        return NextResponse.json({ error: 'amount required' }, { status: 400 });
      }
      const count = await setPointsToAll(amount);
      return NextResponse.json({ count, amount });
    }

    if (action === 'resetAll') {
      const count = await resetAllPoints();
      return NextResponse.json({ count });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Points API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}