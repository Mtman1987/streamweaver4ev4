import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { resolve } from 'path';

const SETTINGS_FILE = resolve(process.cwd(), 'tokens', 'avatar-settings.json');
const PUBLIC_AVATARS_DIR = resolve(process.cwd(), 'public', 'avatars');

export async function POST(request: NextRequest) {
    try {
        const { type, data, animationType } = await request.json();
        
        if (!type || !data) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Save file to public/avatars
        await mkdir(PUBLIC_AVATARS_DIR, { recursive: true });

        const normalizedType = (() => {
            if (typeof animationType === 'string' && animationType.length > 0) {
                return animationType === 'lottie' ? 'json' : animationType;
            }
            if (typeof data === 'string' && data.startsWith('data:video/mp4')) return 'mp4';
            if (typeof data === 'string' && data.startsWith('data:image/gif')) return 'gif';
            return 'json';
        })();
        
        const filename = `${type}.${normalizedType}`;
        const filepath = resolve(PUBLIC_AVATARS_DIR, filename);
        
        // Handle base64 data (MP4/GIF) vs JSON (Lottie)
        if (typeof data === 'string' && data.startsWith('data:')) {
            const base64Data = data.replace(/^data:.+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            await writeFile(filepath, buffer);
        } else {
            // Lottie JSON
            await writeFile(filepath, JSON.stringify(data));
        }

        // Persist settings so OBS overlay can load without browser localStorage
        let settings: any = {
            isVisible: false,
            isTalking: false,
            currentAnimation: 'idle',
            animationType: normalizedType === 'json' ? 'lottie' : normalizedType,
            idleFile: '',
            talkingFile: '',
        };
        try {
            const existing = await readFile(SETTINGS_FILE, 'utf-8');
            settings = { ...settings, ...(JSON.parse(existing) || {}) };
        } catch {}
        settings.animationType = normalizedType === 'json' ? 'lottie' : normalizedType;
        settings[`${type}File`] = filename;
        await mkdir(resolve(process.cwd(), 'tokens'), { recursive: true });
        await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        
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

        const tryFiles =
            format !== 'lottie'
                ? [`${type}.${format}`]
                : [`${type}.json`, `${type}.mp4`, `${type}.gif`];

        for (const file of tryFiles) {
            const filePath = resolve(PUBLIC_AVATARS_DIR, file);
            try {
                await access(filePath);
                if (file.endsWith('.json')) {
                    const data = await readFile(filePath, 'utf-8');
                    return NextResponse.json({ data: JSON.parse(data), animationType: 'lottie', file });
                }
                const mediaType = file.endsWith('.mp4') ? 'mp4' : 'gif';
                return NextResponse.json({ url: `/avatars/${file}`, animationType: mediaType, file });
            } catch {}
        }

        return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }
}
