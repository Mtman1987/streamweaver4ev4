import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/services/speech';

export async function POST(request: NextRequest) {
    try {
        const { base64Audio } = await request.json();

        if (!base64Audio || typeof base64Audio !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid base64Audio parameter' },
                { status: 400 }
            );
        }

        const result = await transcribeAudio(base64Audio);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Speech transcription API error:', error);
        return NextResponse.json(
            { error: 'Internal server error during transcription' },
            { status: 500 }
        );
    }
}
