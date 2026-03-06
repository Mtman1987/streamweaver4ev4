import { NextRequest, NextResponse } from 'next/server';
import { addExcludedUser, removeExcludedUser, getExcludedUsers } from '../../../services/welcome-wagon-tracker';

export async function GET() {
  try {
    const excludedUsers = await getExcludedUsers();
    return NextResponse.json({ excludedUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get excluded users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, action } = await request.json();
    
    if (!username || !action) {
      return NextResponse.json({ error: 'Username and action required' }, { status: 400 });
    }
    
    if (action === 'add') {
      await addExcludedUser(username);
      return NextResponse.json({ message: `Added ${username} to excluded list` });
    } else if (action === 'remove') {
      await removeExcludedUser(username);
      return NextResponse.json({ message: `Removed ${username} from excluded list` });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update excluded users' }, { status: 500 });
  }
}