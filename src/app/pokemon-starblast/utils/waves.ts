// Pokemon Starblast - Wave Definitions

import { WaveDefinition, EnemyBehavior, SpawnPattern } from '../types';
import { pokemon, getPokemonByType } from '@/data/pokemon';

// Get Pokemon IDs by type for wave theming
const getTypeIds = (type: string, limit: number = 10): number[] => {
  const typePokemon = getPokemonByType(type)
    .filter(p => p.id <= 151) // Gen 1 for regular enemies
    .slice(0, limit);
  return typePokemon.map(p => p.id);
};

// Type pools for each wave type
const typePools: Record<string, number[]> = {
  normal: getTypeIds('normal'),
  fire: getTypeIds('fire'),
  water: getTypeIds('water'),
  electric: getTypeIds('electric'),
  grass: getTypeIds('grass'),
  ice: getTypeIds('ice'),
  fighting: getTypeIds('fighting'),
  poison: getTypeIds('poison'),
  ground: getTypeIds('ground'),
  flying: getTypeIds('flying'),
  psychic: getTypeIds('psychic'),
  bug: getTypeIds('bug'),
  rock: getTypeIds('rock'),
  ghost: getTypeIds('ghost'),
  dragon: getTypeIds('dragon'),
};

// If a type pool is empty, use normal type
Object.keys(typePools).forEach(type => {
  if (typePools[type].length === 0) {
    typePools[type] = typePools.normal;
  }
});

// Helper to create enemy group
function createEnemyGroup(
  type: string,
  behavior: EnemyBehavior,
  count: number,
  pattern: SpawnPattern,
  delay: number = 0
) {
  const ids = typePools[type] || typePools.normal;
  const pokemonId = ids[Math.floor(Math.random() * ids.length)] || 16; // Default to Pidgey
  return {
    pokemonId,
    behavior,
    count,
    spawnPattern: pattern,
    delay,
  };
}

// ============ Wave Definitions (30 waves) ============

export const WAVES: WaveDefinition[] = [
  // Wave 1 - Tutorial: Basic divers
  {
    number: 1,
    name: 'First Flight',
    type: 'flying',
    enemies: [
      { pokemonId: 16, behavior: 'diver', count: 3, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 17, behavior: 'diver', count: 2, spawnPattern: 'single', delay: 2 },
    ],
    spawnDelay: 1.5,
    bossWave: false,
  },

  // Wave 2 - Bug swarm
  {
    number: 2,
    name: 'Bug Swarm',
    type: 'bug',
    enemies: [
      { pokemonId: 10, behavior: 'weaver', count: 5, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 13, behavior: 'diver', count: 3, spawnPattern: 'wave', delay: 2 },
    ],
    spawnDelay: 1.0,
    bossWave: false,
  },

  // Wave 3 - Poison mist
  {
    number: 3,
    name: 'Poison Mist',
    type: 'poison',
    enemies: [
      { pokemonId: 41, behavior: 'swooper', count: 4, spawnPattern: 'diagonal', delay: 0 },
      { pokemonId: 23, behavior: 'weaver', count: 3, spawnPattern: 'single', delay: 1.5 },
    ],
    spawnDelay: 1.2,
    bossWave: false,
  },

  // Wave 4 - Normal force
  {
    number: 4,
    name: 'Normal Force',
    type: 'normal',
    enemies: [
      { pokemonId: 19, behavior: 'charger', count: 4, spawnPattern: 'v-formation', delay: 0 },
      { pokemonId: 20, behavior: 'bomber', count: 2, spawnPattern: 'single', delay: 2 },
    ],
    spawnDelay: 1.0,
    bossWave: false,
  },

  // Wave 5 - Water surge
  {
    number: 5,
    name: 'Water Surge',
    type: 'water',
    enemies: [
      { pokemonId: 72, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 118, behavior: 'swooper', count: 3, spawnPattern: 'diagonal', delay: 1.5 },
      { pokemonId: 129, behavior: 'diver', count: 5, spawnPattern: 'swarm', delay: 3 },
    ],
    spawnDelay: 1.0,
    bossWave: false,
  },

  // Wave 6 - Fire storm
  {
    number: 6,
    name: 'Fire Storm',
    type: 'fire',
    enemies: [
      { pokemonId: 37, behavior: 'sniper', count: 2, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 58, behavior: 'charger', count: 3, spawnPattern: 'v-formation', delay: 1 },
      { pokemonId: 77, behavior: 'diver', count: 3, spawnPattern: 'single', delay: 2.5 },
    ],
    spawnDelay: 1.0,
    bossWave: false,
  },

  // Wave 7 - Electric shock
  {
    number: 7,
    name: 'Electric Shock',
    type: 'electric',
    enemies: [
      { pokemonId: 25, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 81, behavior: 'circler', count: 3, spawnPattern: 'single', delay: 1.5 },
      { pokemonId: 100, behavior: 'bomber', count: 2, spawnPattern: 'diagonal', delay: 3 },
    ],
    spawnDelay: 0.9,
    bossWave: false,
  },

  // Wave 8 - Grass garden
  {
    number: 8,
    name: 'Grass Garden',
    type: 'grass',
    enemies: [
      { pokemonId: 43, behavior: 'weaver', count: 5, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 69, behavior: 'diver', count: 3, spawnPattern: 'wave', delay: 1.5 },
      { pokemonId: 114, behavior: 'sniper', count: 2, spawnPattern: 'single', delay: 3 },
    ],
    spawnDelay: 0.9,
    bossWave: false,
  },

  // Wave 9 - Ground tremor
  {
    number: 9,
    name: 'Ground Tremor',
    type: 'ground',
    enemies: [
      { pokemonId: 50, behavior: 'diver', count: 5, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 27, behavior: 'charger', count: 3, spawnPattern: 'v-formation', delay: 1.5 },
      { pokemonId: 104, behavior: 'bomber', count: 2, spawnPattern: 'wave', delay: 3 },
    ],
    spawnDelay: 0.85,
    bossWave: false,
  },

  // Wave 10 - BOSS: Articuno
  {
    number: 10,
    name: 'Frozen Throne',
    type: 'ice',
    enemies: [], // Boss only
    spawnDelay: 1.0,
    bossWave: true,
    bossId: 'articuno',
  },

  // Wave 11 - Ice storm aftermath
  {
    number: 11,
    name: 'Ice Storm',
    type: 'ice',
    enemies: [
      { pokemonId: 86, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 87, behavior: 'bomber', count: 2, spawnPattern: 'single', delay: 1.5 },
      { pokemonId: 90, behavior: 'diver', count: 4, spawnPattern: 'swarm', delay: 2.5 },
    ],
    spawnDelay: 0.85,
    bossWave: false,
  },

  // Wave 12 - Fighting spirit
  {
    number: 12,
    name: 'Fighting Spirit',
    type: 'fighting',
    enemies: [
      { pokemonId: 56, behavior: 'charger', count: 4, spawnPattern: 'v-formation', delay: 0 },
      { pokemonId: 66, behavior: 'diver', count: 3, spawnPattern: 'wave', delay: 1.5 },
      { pokemonId: 106, behavior: 'swooper', count: 2, spawnPattern: 'diagonal', delay: 3 },
    ],
    spawnDelay: 0.8,
    bossWave: false,
  },

  // Wave 13 - Rock slide
  {
    number: 13,
    name: 'Rock Slide',
    type: 'rock',
    enemies: [
      { pokemonId: 74, behavior: 'diver', count: 5, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 95, behavior: 'weaver', count: 2, spawnPattern: 'single', delay: 2 },
      { pokemonId: 111, behavior: 'charger', count: 3, spawnPattern: 'wave', delay: 3.5 },
    ],
    spawnDelay: 0.8,
    bossWave: false,
  },

  // Wave 14 - Ghost night
  {
    number: 14,
    name: 'Ghost Night',
    type: 'ghost',
    enemies: [
      { pokemonId: 92, behavior: 'weaver', count: 4, spawnPattern: 'random', delay: 0 },
      { pokemonId: 93, behavior: 'swooper', count: 3, spawnPattern: 'diagonal', delay: 1.5 },
      { pokemonId: 94, behavior: 'sniper', count: 2, spawnPattern: 'single', delay: 3 },
    ],
    spawnDelay: 0.75,
    bossWave: false,
  },

  // Wave 15 - Psychic wave
  {
    number: 15,
    name: 'Psychic Wave',
    type: 'psychic',
    enemies: [
      { pokemonId: 63, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 79, behavior: 'bomber', count: 3, spawnPattern: 'single', delay: 1.5 },
      { pokemonId: 96, behavior: 'circler', count: 3, spawnPattern: 'diagonal', delay: 3 },
    ],
    spawnDelay: 0.75,
    bossWave: false,
  },

  // Wave 16 - Flying aces
  {
    number: 16,
    name: 'Flying Aces',
    type: 'flying',
    enemies: [
      { pokemonId: 21, behavior: 'swooper', count: 5, spawnPattern: 'v-formation', delay: 0 },
      { pokemonId: 84, behavior: 'diver', count: 4, spawnPattern: 'wave', delay: 1.5 },
      { pokemonId: 83, behavior: 'sniper', count: 2, spawnPattern: 'single', delay: 3 },
    ],
    spawnDelay: 0.7,
    bossWave: false,
  },

  // Wave 17 - Bug invasion
  {
    number: 17,
    name: 'Bug Invasion',
    type: 'bug',
    enemies: [
      { pokemonId: 11, behavior: 'diver', count: 6, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 12, behavior: 'weaver', count: 3, spawnPattern: 'wave', delay: 1 },
      { pokemonId: 15, behavior: 'bomber', count: 2, spawnPattern: 'diagonal', delay: 2 },
      { pokemonId: 123, behavior: 'charger', count: 2, spawnPattern: 'single', delay: 3.5 },
    ],
    spawnDelay: 0.65,
    bossWave: false,
  },

  // Wave 18 - Poison cloud
  {
    number: 18,
    name: 'Poison Cloud',
    type: 'poison',
    enemies: [
      { pokemonId: 42, behavior: 'swooper', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 88, behavior: 'weaver', count: 3, spawnPattern: 'single', delay: 1.5 },
      { pokemonId: 89, behavior: 'bomber', count: 2, spawnPattern: 'diagonal', delay: 3 },
    ],
    spawnDelay: 0.65,
    bossWave: false,
  },

  // Wave 19 - Electric field
  {
    number: 19,
    name: 'Electric Field',
    type: 'electric',
    enemies: [
      { pokemonId: 26, behavior: 'weaver', count: 3, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 82, behavior: 'circler', count: 4, spawnPattern: 'swarm', delay: 1 },
      { pokemonId: 101, behavior: 'bomber', count: 3, spawnPattern: 'diagonal', delay: 2.5 },
      { pokemonId: 125, behavior: 'charger', count: 2, spawnPattern: 'single', delay: 4 },
    ],
    spawnDelay: 0.6,
    bossWave: false,
  },

  // Wave 20 - BOSS: Zapdos
  {
    number: 20,
    name: 'Thunder God',
    type: 'electric',
    enemies: [],
    spawnDelay: 1.0,
    bossWave: true,
    bossId: 'zapdos',
  },

  // Wave 21 - Fire inferno
  {
    number: 21,
    name: 'Fire Inferno',
    type: 'fire',
    enemies: [
      { pokemonId: 38, behavior: 'sniper', count: 3, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 59, behavior: 'charger', count: 3, spawnPattern: 'v-formation', delay: 1 },
      { pokemonId: 78, behavior: 'weaver', count: 4, spawnPattern: 'swarm', delay: 2 },
      { pokemonId: 126, behavior: 'bomber', count: 2, spawnPattern: 'single', delay: 3.5 },
    ],
    spawnDelay: 0.55,
    bossWave: false,
  },

  // Wave 22 - Water flood
  {
    number: 22,
    name: 'Water Flood',
    type: 'water',
    enemies: [
      { pokemonId: 73, behavior: 'weaver', count: 5, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 91, behavior: 'bomber', count: 3, spawnPattern: 'diagonal', delay: 1 },
      { pokemonId: 119, behavior: 'swooper', count: 4, spawnPattern: 'single', delay: 2 },
      { pokemonId: 130, behavior: 'charger', count: 2, spawnPattern: 'v-formation', delay: 3.5 },
    ],
    spawnDelay: 0.55,
    bossWave: false,
  },

  // Wave 23 - Grass jungle
  {
    number: 23,
    name: 'Grass Jungle',
    type: 'grass',
    enemies: [
      { pokemonId: 44, behavior: 'weaver', count: 4, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 45, behavior: 'sniper', count: 2, spawnPattern: 'wave', delay: 1.5 },
      { pokemonId: 70, behavior: 'diver', count: 4, spawnPattern: 'diagonal', delay: 2.5 },
      { pokemonId: 71, behavior: 'bomber', count: 2, spawnPattern: 'single', delay: 4 },
    ],
    spawnDelay: 0.5,
    bossWave: false,
  },

  // Wave 24 - Ground quake
  {
    number: 24,
    name: 'Ground Quake',
    type: 'ground',
    enemies: [
      { pokemonId: 51, behavior: 'diver', count: 6, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 28, behavior: 'charger', count: 4, spawnPattern: 'v-formation', delay: 1 },
      { pokemonId: 105, behavior: 'bomber', count: 3, spawnPattern: 'wave', delay: 2.5 },
      { pokemonId: 112, behavior: 'sniper', count: 2, spawnPattern: 'single', delay: 4 },
    ],
    spawnDelay: 0.5,
    bossWave: false,
  },

  // Wave 25 - Dragon's breath
  {
    number: 25,
    name: "Dragon's Breath",
    type: 'dragon',
    enemies: [
      { pokemonId: 147, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 148, behavior: 'swooper', count: 3, spawnPattern: 'diagonal', delay: 2 },
    ],
    spawnDelay: 0.5,
    bossWave: false,
  },

  // Wave 26 - Psychic assault
  {
    number: 26,
    name: 'Psychic Assault',
    type: 'psychic',
    enemies: [
      { pokemonId: 64, behavior: 'weaver', count: 4, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 65, behavior: 'sniper', count: 2, spawnPattern: 'single', delay: 1 },
      { pokemonId: 80, behavior: 'bomber', count: 3, spawnPattern: 'diagonal', delay: 2 },
      { pokemonId: 97, behavior: 'circler', count: 3, spawnPattern: 'swarm', delay: 3 },
      { pokemonId: 122, behavior: 'charger', count: 2, spawnPattern: 'v-formation', delay: 4 },
    ],
    spawnDelay: 0.45,
    bossWave: false,
  },

  // Wave 27 - Ghost realm
  {
    number: 27,
    name: 'Ghost Realm',
    type: 'ghost',
    enemies: [
      { pokemonId: 92, behavior: 'weaver', count: 5, spawnPattern: 'random', delay: 0 },
      { pokemonId: 93, behavior: 'swooper', count: 4, spawnPattern: 'diagonal', delay: 1 },
      { pokemonId: 94, behavior: 'sniper', count: 3, spawnPattern: 'wave', delay: 2.5 },
    ],
    spawnDelay: 0.45,
    bossWave: false,
  },

  // Wave 28 - Fighting fury
  {
    number: 28,
    name: 'Fighting Fury',
    type: 'fighting',
    enemies: [
      { pokemonId: 57, behavior: 'charger', count: 5, spawnPattern: 'v-formation', delay: 0 },
      { pokemonId: 67, behavior: 'diver', count: 4, spawnPattern: 'wave', delay: 1 },
      { pokemonId: 68, behavior: 'bomber', count: 2, spawnPattern: 'single', delay: 2 },
      { pokemonId: 107, behavior: 'swooper', count: 3, spawnPattern: 'diagonal', delay: 3 },
    ],
    spawnDelay: 0.4,
    bossWave: false,
  },

  // Wave 29 - Prelude to fire
  {
    number: 29,
    name: 'Prelude to Fire',
    type: 'fire',
    enemies: [
      { pokemonId: 37, behavior: 'weaver', count: 5, spawnPattern: 'swarm', delay: 0 },
      { pokemonId: 38, behavior: 'sniper', count: 3, spawnPattern: 'wave', delay: 1 },
      { pokemonId: 77, behavior: 'diver', count: 5, spawnPattern: 'diagonal', delay: 2 },
      { pokemonId: 78, behavior: 'bomber', count: 3, spawnPattern: 'single', delay: 3 },
      { pokemonId: 126, behavior: 'charger', count: 2, spawnPattern: 'v-formation', delay: 4 },
    ],
    spawnDelay: 0.35,
    bossWave: false,
  },

  // Wave 30 - BOSS: Moltres
  {
    number: 30,
    name: 'Phoenix Rising',
    type: 'fire',
    enemies: [],
    spawnDelay: 1.0,
    bossWave: true,
    bossId: 'moltres',
  },

  // Wave 31-39: Additional challenging waves...
  {
    number: 31,
    name: 'Dark Storm',
    type: 'dark',
    enemies: [
      { pokemonId: 52, behavior: 'weaver', count: 5, spawnPattern: 'wave', delay: 0 },
      { pokemonId: 53, behavior: 'swooper', count: 4, spawnPattern: 'diagonal', delay: 1 },
      { pokemonId: 94, behavior: 'sniper', count: 3, spawnPattern: 'single', delay: 2 },
    ],
    spawnDelay: 0.35,
    bossWave: false,
  },

  // Wave 40 - BOSS: Mewtwo
  {
    number: 40,
    name: 'Genetic Power',
    type: 'psychic',
    enemies: [],
    spawnDelay: 1.0,
    bossWave: true,
    bossId: 'mewtwo',
  },

  // Continue to wave 50...
  ...Array.from({ length: 9 }, (_, i) => ({
    number: 41 + i,
    name: `Wave ${41 + i}`,
    type: ['dragon', 'psychic', 'fire', 'electric', 'ice', 'fighting', 'ghost', 'water', 'grass'][i],
    enemies: [
      { pokemonId: [147, 65, 126, 125, 91, 68, 94, 130, 71][i], behavior: 'weaver' as const, count: 5 + i, spawnPattern: 'wave' as const, delay: 0 },
      { pokemonId: [148, 97, 78, 82, 87, 107, 93, 119, 45][i], behavior: 'charger' as const, count: 3 + Math.floor(i / 2), spawnPattern: 'v-formation' as const, delay: 1 },
    ],
    spawnDelay: Math.max(0.25, 0.35 - i * 0.01),
    bossWave: false,
  })),

  // Wave 50 - BOSS: Rayquaza (final boss)
  {
    number: 50,
    name: 'Sky Serpent',
    type: 'dragon',
    enemies: [],
    spawnDelay: 1.0,
    bossWave: true,
    bossId: 'rayquaza',
  },
];

// Get wave by number
export function getWave(waveNumber: number): WaveDefinition {
  // If we've gone past our defined waves, generate harder versions
  if (waveNumber > WAVES.length) {
    const baseWave = WAVES[(waveNumber - 1) % 30]; // Cycle through waves
    const multiplier = Math.floor(waveNumber / 30) + 1;

    return {
      ...baseWave,
      number: waveNumber,
      name: `${baseWave.name} ${'+'.repeat(multiplier)}`,
      enemies: baseWave.enemies.map(e => ({
        ...e,
        count: Math.floor(e.count * (1 + multiplier * 0.5)),
      })),
      spawnDelay: Math.max(0.2, baseWave.spawnDelay - multiplier * 0.05),
    };
  }

  return WAVES[waveNumber - 1];
}

// Get total defined waves
export function getTotalWaves(): number {
  return WAVES.length;
}

// Check if wave is a boss wave
export function isBossWave(waveNumber: number): boolean {
  const wave = getWave(waveNumber);
  return wave.bossWave;
}

// Count total enemies in a wave
export function getWaveEnemyCount(wave: WaveDefinition): number {
  return wave.enemies.reduce((sum, group) => sum + group.count, 0);
}
