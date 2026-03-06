import { NextRequest, NextResponse } from 'next/server';
import { exportActionToDiscord } from '@/ai/flows/export-action-to-discord';

export async function POST(request: NextRequest) {
  try {
    const { action, description } = await request.json();
    
    const result = await exportActionToDiscord({ action, description });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to export action:', error);
    return NextResponse.json({ 
      error: 'Failed to export action',
      success: false
    }, { status: 500 });
  }
}