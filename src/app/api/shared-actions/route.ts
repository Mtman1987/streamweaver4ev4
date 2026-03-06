import { NextResponse } from 'next/server';
import { getSharedActions } from '@/ai/flows/get-shared-actions';

export async function GET() {
  try {
    const result = await getSharedActions();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to get shared actions:', error);
    return NextResponse.json({ 
      error: 'Failed to load shared actions',
      actions: []
    }, { status: 500 });
  }
}