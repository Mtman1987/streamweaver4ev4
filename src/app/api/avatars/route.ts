import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

const AVATARS_DIR = resolve(process.cwd(), 'tokens', 'avatars');
const SETTINGS_FILE = resolve(process.cwd(), 'tokens', 'avatar-settings.json');

export async function POST(request: NextRequest) {
    try {
        const { type, data, animationType } = await request.json();
        
        if (!type || !data) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Save file to public/avatars
        const avatarsDir = resolve(process.cwd(), 'public', 'avatars');
        await mkdir(avatarsDir, { recursive: true });
        
        const filename = `${type}.${animationType}`;
        const filepath = resolve(avatarsDir, filename);
        
        // Handle base64 data (MP4/GIF) vs JSON (Lottie)
        if (typeof data === 'string' && data.startsWith('data:')) {
            const base64Data = data.replace(/^data:.+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            await writeFile(filepath, buffer);
        } else {
            // Lottie JSON
            await writeFile(filepath, JSON.stringify(data));
        }
        
        return NextResponse.json({ success: true, filename });
    } catch (error: any) {
        console.error('[Avatar API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const format = searchParams.get('format') || 'lottie';
        
        if (type === 'settings') {
            try {
                const data = await readFile(SETTINGS_FILE, 'utf-8');
                return NextResponse.json({ data: JSON.parse(data) });
            } catch {
                return NextResponse.json({ data: {
                    isVisible: false,
                    isTalking: false,
                    currentAnimation: 'idle',
                    animationType: 'lottie'
                }});
            }
        }
        
        if (!type || !['idle', 'talking', 'gesture'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (format === 'lottie') {
            const filePath = resolve(AVATARS_DIR, `${type}-animation.json`);
            const data = await readFile(filePath, 'utf-8');
            return NextResponse.json({ data: JSON.parse(data) });
        } else {
            const filePath = resolve(AVATARS_DIR, `${type}-${format}.txt`);
            const url = await readFile(filePath, 'utf-8');
            return NextResponse.json({ url: url.trim() });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }
}