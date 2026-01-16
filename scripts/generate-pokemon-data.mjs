import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'pokemon.db');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'pokemon.ts');

async function main() {
  console.log('Generating Pokemon data from SQLite database...\n');

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Fetch all Pokemon
  const results = db.exec(`
    SELECT
      id, name, types, height, weight,
      hp, attack, defense, special_attack, special_defense, speed,
      abilities, moves_count, base_experience,
      genus, flavor_text, generation, habitat, growth_rate,
      capture_rate, base_happiness, is_baby, is_legendary, is_mythical,
      gender_rate, egg_groups, evolution_chain_id, evolves_from,
      color, shape, image, sprite_front, sprite_back, sprite_shiny
    FROM pokemon
    ORDER BY id
  `);

  if (!results.length) {
    console.error('No data found in database!');
    process.exit(1);
  }

  const columns = results[0].columns;
  const rows = results[0].values;

  console.log(`Found ${rows.length} Pokemon`);

  // Convert to Pokemon objects
  const pokemonList = rows.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];

      // Parse JSON fields
      if (['types', 'abilities', 'egg_groups'].includes(col) && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = [];
        }
      }

      // Convert boolean fields
      if (['is_baby', 'is_legendary', 'is_mythical'].includes(col)) {
        value = value === 1;
      }

      obj[col] = value;
    });
    return obj;
  });

  // Generate TypeScript file
  const tsContent = `// Auto-generated from SQLite database - DO NOT EDIT MANUALLY
// Generated on: ${new Date().toISOString()}
// Total Pokemon: ${pokemonList.length}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  height: number;  // in decimeters
  weight: number;  // in hectograms
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  abilities: { name: string; is_hidden: boolean }[];
  moves_count: number;
  base_experience: number;
  genus: string;
  flavor_text: string;
  generation: string;
  habitat: string | null;
  growth_rate: string | null;
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  gender_rate: number;  // -1 = genderless, 0-8 = female ratio in eighths
  egg_groups: string[];
  evolution_chain_id: number | null;
  evolves_from: string | null;
  color: string | null;
  shape: string | null;
  image: string;
  sprite_front: string | null;
  sprite_back: string | null;
  sprite_shiny: string | null;
}

export const pokemon: Pokemon[] = ${JSON.stringify(pokemonList, null, 2)};

// Helper maps for quick lookup
export const pokemonById = new Map<number, Pokemon>(
  pokemon.map(p => [p.id, p])
);

export const pokemonByName = new Map<string, Pokemon>(
  pokemon.map(p => [p.name.toLowerCase(), p])
);

// Legendary Pokemon (for games that need special handling)
export const legendaryPokemon = pokemon.filter(p => p.is_legendary);
export const mythicalPokemon = pokemon.filter(p => p.is_mythical);

// Evolution chains grouped by chain ID
export const evolutionChains = new Map<number, Pokemon[]>();
pokemon.forEach(p => {
  if (p.evolution_chain_id) {
    if (!evolutionChains.has(p.evolution_chain_id)) {
      evolutionChains.set(p.evolution_chain_id, []);
    }
    evolutionChains.get(p.evolution_chain_id)!.push(p);
  }
});

// Sort each evolution chain by ID (roughly corresponds to evolution order)
evolutionChains.forEach((chain, id) => {
  chain.sort((a, b) => a.id - b.id);
});

// Get height in meters
export function getHeightInMeters(pokemon: Pokemon): number {
  return pokemon.height / 10;
}

// Get weight in kg
export function getWeightInKg(pokemon: Pokemon): number {
  return pokemon.weight / 10;
}

// Get Pokemon by type
export function getPokemonByType(type: string): Pokemon[] {
  return pokemon.filter(p => p.types.includes(type));
}

// Get all unique types
export const allTypes = [...new Set(pokemon.flatMap(p => p.types))].sort();

// Get all unique generations
export const allGenerations = [...new Set(pokemon.map(p => p.generation).filter(Boolean))].sort();
`;

  fs.writeFileSync(OUTPUT_PATH, tsContent);
  console.log(`\n✓ Generated ${OUTPUT_PATH}`);
  console.log(`✓ Total Pokemon: ${pokemonList.length}`);
  console.log(`✓ Legendaries: ${pokemonList.filter(p => p.is_legendary).length}`);
  console.log(`✓ Mythicals: ${pokemonList.filter(p => p.is_mythical).length}`);

  db.close();
}

main().catch(console.error);
