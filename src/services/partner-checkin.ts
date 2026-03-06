import fs from 'fs';
import path from 'path';

const PARTNERS_FILE = path.join(process.cwd(), 'tokens', 'partners.txt');

interface Partner {
  id: number;
  name: string;
  imagePath: string;
  discordLink: string;
}

function loadPartners(): Partner[] {
  if (!fs.existsSync(PARTNERS_FILE)) {
    console.log('[Partner Checkin] Partners file not found, returning empty list');
    return [];
  }
  
  const content = fs.readFileSync(PARTNERS_FILE, 'utf-8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      const [id, name, imagePath, discordLink] = line.split('|');
      const fixedPath = imagePath.replace(
        'C:\\Users\\mtman\\Desktop\\streamweaver-v2-main',
        path.join(process.cwd())
      );
      return { id: parseInt(id), name, imagePath: fixedPath, discordLink };
    });
}

export function getPartnerById(id: number): Partner | null {
  const partners = loadPartners();
  return partners.find(p => p.id === id) || null;
}

export function getAllPartners(): Partner[] {
  return loadPartners();
}
