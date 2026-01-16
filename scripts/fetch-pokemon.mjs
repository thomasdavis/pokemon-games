import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public', 'pokemon');
const DB_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'pokemon.db');

const TOTAL_POKEMON = 1008;
const BATCH_SIZE = 20;
const CONCURRENT_DOWNLOADS = 10;

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchPokemon(id) {
  // Fetch main Pokemon data
  const pokemon = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${id}`);

  // Fetch species data for additional info
  let species = null;
  try {
    species = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  } catch (err) {
    console.log(`  (No species data for #${id})`);
  }

  // Get English flavor text
  let flavorText = '';
  if (species?.flavor_text_entries) {
    const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    if (entry) {
      flavorText = entry.flavor_text.replace(/[\n\f]/g, ' ').trim();
    }
  }

  // Get English genus (e.g., "Seed Pokémon")
  let genus = '';
  if (species?.genera) {
    const genusEntry = species.genera.find(g => g.language.name === 'en');
    if (genusEntry) genus = genusEntry.genus;
  }

  // Get evolution chain ID
  let evolutionChainId = null;
  if (species?.evolution_chain?.url) {
    const match = species.evolution_chain.url.match(/\/(\d+)\/?$/);
    if (match) evolutionChainId = parseInt(match[1]);
  }

  // Format name properly (handle special characters)
  let name = pokemon.name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

  // Special name fixes
  const nameMap = {
    'Nidoran-f': 'Nidoran♀',
    'Nidoran-m': 'Nidoran♂',
    'Mr-mime': 'Mr. Mime',
    'Mr-rime': 'Mr. Rime',
    'Mime-jr': 'Mime Jr.',
    'Type-null': 'Type: Null',
    'Ho-oh': 'Ho-Oh',
    'Porygon-z': 'Porygon-Z',
    'Jangmo-o': 'Jangmo-o',
    'Hakamo-o': 'Hakamo-o',
    'Kommo-o': 'Kommo-o',
    'Tapu-koko': 'Tapu Koko',
    'Tapu-lele': 'Tapu Lele',
    'Tapu-bulu': 'Tapu Bulu',
    'Tapu-fini': 'Tapu Fini',
  };
  if (nameMap[name]) name = nameMap[name];

  return {
    id: pokemon.id,
    name: name,
    types: pokemon.types.map(t => t.type.name),
    height: pokemon.height, // in decimeters
    weight: pokemon.weight, // in hectograms

    // Stats
    hp: pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 0,
    attack: pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0,
    defense: pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 0,
    special_attack: pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0,
    special_defense: pokemon.stats.find(s => s.stat.name === 'special-defense')?.base_stat || 0,
    speed: pokemon.stats.find(s => s.stat.name === 'speed')?.base_stat || 0,

    // Abilities
    abilities: pokemon.abilities.map(a => ({
      name: a.ability.name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
      is_hidden: a.is_hidden
    })),

    // Moves count and some signature moves
    moves_count: pokemon.moves.length,
    moves: pokemon.moves.slice(0, 20).map(m =>
      m.move.name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    ),

    // Base experience
    base_experience: pokemon.base_experience || 0,

    // Species info
    genus: genus,
    flavor_text: flavorText,
    generation: species?.generation?.name?.replace('generation-', '').toUpperCase() || '',
    habitat: species?.habitat?.name || null,
    growth_rate: species?.growth_rate?.name || null,
    capture_rate: species?.capture_rate || 0,
    base_happiness: species?.base_happiness || 0,
    is_baby: species?.is_baby || false,
    is_legendary: species?.is_legendary || false,
    is_mythical: species?.is_mythical || false,
    gender_rate: species?.gender_rate ?? -1, // -1 = genderless, 0-8 = female ratio in eighths
    egg_groups: species?.egg_groups?.map(e => e.name) || [],
    evolution_chain_id: evolutionChainId,
    evolves_from: species?.evolves_from_species?.name || null,

    // Colors
    color: species?.color?.name || null,
    shape: species?.shape?.name || null,

    // Images
    image_url: pokemon.sprites.other['official-artwork'].front_default ||
               pokemon.sprites.front_default,
    sprite_front: pokemon.sprites.front_default,
    sprite_back: pokemon.sprites.back_default,
    sprite_shiny: pokemon.sprites.front_shiny,

    // Cry/sound
    cries: pokemon.cries || null,
  };
}

async function downloadImage(url, filepath) {
  if (fs.existsSync(filepath)) {
    return true;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return false;

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    return true;
  } catch (err) {
    return false;
  }
}

async function processBatch(ids, db) {
  const results = [];

  for (const id of ids) {
    try {
      const pokemon = await fetchPokemon(id);
      results.push(pokemon);

      // Insert into database
      db.run(`
        INSERT OR REPLACE INTO pokemon (
          id, name, types, height, weight,
          hp, attack, defense, special_attack, special_defense, speed,
          abilities, moves_count, moves, base_experience,
          genus, flavor_text, generation, habitat, growth_rate,
          capture_rate, base_happiness, is_baby, is_legendary, is_mythical,
          gender_rate, egg_groups, evolution_chain_id, evolves_from,
          color, shape, image, sprite_front, sprite_back, sprite_shiny, cries
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        pokemon.id,
        pokemon.name,
        JSON.stringify(pokemon.types),
        pokemon.height,
        pokemon.weight,
        pokemon.hp,
        pokemon.attack,
        pokemon.defense,
        pokemon.special_attack,
        pokemon.special_defense,
        pokemon.speed,
        JSON.stringify(pokemon.abilities),
        pokemon.moves_count,
        JSON.stringify(pokemon.moves),
        pokemon.base_experience,
        pokemon.genus,
        pokemon.flavor_text,
        pokemon.generation,
        pokemon.habitat,
        pokemon.growth_rate,
        pokemon.capture_rate,
        pokemon.base_happiness,
        pokemon.is_baby ? 1 : 0,
        pokemon.is_legendary ? 1 : 0,
        pokemon.is_mythical ? 1 : 0,
        pokemon.gender_rate,
        JSON.stringify(pokemon.egg_groups),
        pokemon.evolution_chain_id,
        pokemon.evolves_from,
        pokemon.color,
        pokemon.shape,
        `/pokemon/${pokemon.id}.png`,
        pokemon.sprite_front,
        pokemon.sprite_back,
        pokemon.sprite_shiny,
        pokemon.cries ? JSON.stringify(pokemon.cries) : null
      ]);

      console.log(`✓ Fetched #${id} ${pokemon.name} (${pokemon.types.join('/')})`);
    } catch (err) {
      console.error(`✗ Failed to fetch #${id}: ${err.message}`);
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return results;
}

async function downloadImages(pokemonList) {
  console.log('\nDownloading images...');

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < pokemonList.length; i += CONCURRENT_DOWNLOADS) {
    const chunk = pokemonList.slice(i, i + CONCURRENT_DOWNLOADS);

    const promises = chunk.map(async (pokemon) => {
      const filepath = path.join(PUBLIC_DIR, `${pokemon.id}.png`);

      if (fs.existsSync(filepath)) {
        skipped++;
        return;
      }

      if (pokemon.image_url) {
        const success = await downloadImage(pokemon.image_url, filepath);
        if (success) {
          downloaded++;
          console.log(`✓ Downloaded image for #${pokemon.id} ${pokemon.name}`);
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    });

    await Promise.all(promises);
  }

  console.log(`\nImages: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed`);
}

async function main() {
  console.log('Pokemon Database Builder (Extended Data)');
  console.log('=========================================\n');

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create comprehensive table
  db.run(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      types TEXT NOT NULL,
      height INTEGER,
      weight INTEGER,

      -- Base Stats
      hp INTEGER,
      attack INTEGER,
      defense INTEGER,
      special_attack INTEGER,
      special_defense INTEGER,
      speed INTEGER,

      -- Abilities & Moves
      abilities TEXT,
      moves_count INTEGER,
      moves TEXT,
      base_experience INTEGER,

      -- Species Info
      genus TEXT,
      flavor_text TEXT,
      generation TEXT,
      habitat TEXT,
      growth_rate TEXT,
      capture_rate INTEGER,
      base_happiness INTEGER,

      -- Classification
      is_baby INTEGER DEFAULT 0,
      is_legendary INTEGER DEFAULT 0,
      is_mythical INTEGER DEFAULT 0,

      -- Breeding
      gender_rate INTEGER,
      egg_groups TEXT,

      -- Evolution
      evolution_chain_id INTEGER,
      evolves_from TEXT,

      -- Appearance
      color TEXT,
      shape TEXT,

      -- Images
      image TEXT,
      sprite_front TEXT,
      sprite_back TEXT,
      sprite_shiny TEXT,

      -- Sound
      cries TEXT
    )
  `);

  console.log('Created database schema\n');

  const allPokemon = [];

  for (let i = 1; i <= TOTAL_POKEMON; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, TOTAL_POKEMON);
    console.log(`\n--- Fetching Pokemon ${i} to ${batchEnd} ---`);

    const ids = Array.from({ length: batchEnd - i + 1 }, (_, idx) => i + idx);
    const batch = await processBatch(ids, db);
    allPokemon.push(...batch);

    // Save progress
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log(`Progress saved: ${allPokemon.length}/${TOTAL_POKEMON} Pokemon`);
  }

  // Download images
  await downloadImages(allPokemon);

  // Final save
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log(`\n=========================================`);
  console.log(`✓ Database saved to ${DB_PATH}`);
  console.log(`✓ Total Pokemon: ${allPokemon.length}`);
  console.log(`✓ Includes: stats, abilities, moves, species info, evolution data, and more!`);

  db.close();
}

main().catch(console.error);
