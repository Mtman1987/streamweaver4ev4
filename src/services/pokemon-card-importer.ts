import { promises as fs } from 'fs';
import { join } from 'path';
import { PokemonCard, CardDatabase, SetInfo, addCardsToDatabase, updateSetInfo } from './pokemon-booster-packs';

const CARDS_BASE_PATH = join(process.cwd(), 'public', 'pokemon-cards');

/**
 * Import cards from new image library structure:
 * /pokemon-cards/
 *   ├── base-set/
 *   │   ├── common/
 *   │   ├── uncommon/
 *   │   ├── rare/
 *   │   ├── holo/
 *   │   └── energy/
 *   ├── jungle/
 *   └── fossil/
 */
export async function importCardsFromImageLibrary(): Promise<void> {
  try {
    const setFolders = await fs.readdir(CARDS_BASE_PATH, { withFileTypes: true });
    
    for (const setFolder of setFolders) {
      if (!setFolder.isDirectory()) continue;
      
      const setPath = join(CARDS_BASE_PATH, setFolder.name);
      const rarityFolders = await fs.readdir(setPath, { withFileTypes: true });
      
      const cards: PokemonCard[] = [];
      
      for (const rarityFolder of rarityFolders) {
        if (!rarityFolder.isDirectory()) continue;
        
        const rarity = rarityFolder.name as PokemonCard['rarity'];
        const rarityPath = join(setPath, rarityFolder.name);
        const cardFiles = await fs.readdir(rarityPath);
        
        for (const cardFile of cardFiles) {
          if (!cardFile.endsWith('.jpg') && !cardFile.endsWith('.png')) continue;
          
          // Parse filename: card-name_number.jpg
          const match = cardFile.match(/^(.+)_(\d+)\.(jpg|png)$/);
          if (!match) continue;
          
          const [, cardName, number] = match;\n          const cleanName = cardName.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());\n          \n          cards.push({\n            id: `${setFolder.name}-${number.padStart(3, '0')}`,\n            name: cleanName,\n            set: setFolder.name,\n            number,\n            rarity,\n            imagePath: join('/pokemon-cards', setFolder.name, rarityFolder.name, cardFile)\n          });\n        }\n      }\n      \n      // Add cards to database\n      if (cards.length > 0) {\n        await addCardsToDatabase(cards);\n        console.log(`[Pokemon Import] Added ${cards.length} cards from ${setFolder.name}`);\n      }\n    }\n    \n    console.log('[Pokemon Import] Card import completed');\n  } catch (error) {\n    console.error('[Pokemon Import] Failed to import cards:', error);\n  }\n}\n\n/**\n * Import from CSV rarity list:\n * Format: \"Card Name\",\"Set\",\"Number\",\"Rarity\"\n */\nexport async function importFromCSV(csvPath: string): Promise<void> {\n  try {\n    const csvContent = await fs.readFile(csvPath, 'utf-8');\n    const lines = csvContent.split('\\n').slice(1); // Skip header\n    \n    const cards: PokemonCard[] = [];\n    \n    for (const line of lines) {\n      if (!line.trim()) continue;\n      \n      const [name, set, number, rarity] = line.split(',').map(s => s.replace(/\"/g, '').trim());\n      \n      if (name && set && number && rarity) {\n        cards.push({\n          id: `${set}-${number.padStart(3, '0')}`,\n          name,\n          set,\n          number,\n          rarity: rarity.toLowerCase() as PokemonCard['rarity'],\n          imagePath: `/pokemon-cards/${set}/${rarity.toLowerCase()}/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${number}.jpg`\n        });\n      }\n    }\n    \n    await addCardsToDatabase(cards);\n    console.log(`[Pokemon Import] Imported ${cards.length} cards from CSV`);\n  } catch (error) {\n    console.error('[Pokemon Import] Failed to import from CSV:', error);\n  }\n}\n\n// CLI usage: node -e \"require('./src/services/pokemon-card-importer.ts').importCardsFromImageLibrary()\"\n