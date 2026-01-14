const fs = require('fs');
const path = require('path');
const https = require('https');

const POKEMON_COUNT = 150;
const OUTPUT_DIR = path.join(__dirname, '../public/pokemon');
const DATA_FILE = path.join(__dirname, '../src/data/pokemon.ts');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchPokemon() {
  const pokemon = [];

  console.log(`Fetching ${POKEMON_COUNT} Pokemon...`);

  for (let i = 1; i <= POKEMON_COUNT; i++) {
    try {
      const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${i}`);
      const speciesData = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${i}`);

      // Get English name
      const englishName = speciesData.names.find(n => n.language.name === 'en')?.name || data.name;

      // Get sprite URL - use official artwork for better quality
      const spriteUrl = data.sprites.other['official-artwork'].front_default ||
                        data.sprites.front_default;

      // Download image
      const imageFilename = `${i}.png`;
      const imagePath = path.join(OUTPUT_DIR, imageFilename);

      if (spriteUrl) {
        await downloadImage(spriteUrl, imagePath);
        console.log(`Downloaded ${i}. ${englishName}`);
      }

      // Get types
      const types = data.types.map(t => t.type.name);

      pokemon.push({
        id: i,
        name: englishName,
        image: `/pokemon/${imageFilename}`,
        types: types,
      });

    } catch (error) {
      console.error(`Error fetching Pokemon ${i}:`, error.message);
    }
  }

  // Generate TypeScript data file
  const tsContent = `// Auto-generated Pokemon data
export interface Pokemon {
  id: number;
  name: string;
  image: string;
  types: string[];
}

export const pokemon: Pokemon[] = ${JSON.stringify(pokemon, null, 2)};

export const pokemonById = new Map<number, Pokemon>(
  pokemon.map(p => [p.id, p])
);

export const pokemonByName = new Map<string, Pokemon>(
  pokemon.map(p => [p.name.toLowerCase(), p])
);
`;

  fs.writeFileSync(DATA_FILE, tsContent);
  console.log(`\nSaved ${pokemon.length} Pokemon to ${DATA_FILE}`);
  console.log('Done!');
}

fetchPokemon().catch(console.error);
