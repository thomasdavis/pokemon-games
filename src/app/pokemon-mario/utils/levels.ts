// Dynamic endless level generator for Pokemon Mario
// Uses all 1008 Pokemon and procedural generation!

import { Level, Platform, Enemy, Collectible, PowerUp, EnemyType } from '../types';
import { GAME_CONFIG } from './constants';
import { pokemon } from '@/data/pokemon';

const { TILE_SIZE } = GAME_CONFIG;

// All 1008 Pokemon available for the game!
const ALL_POKEMON = pokemon;

// Get random Pokemon from the full database
const getRandomPokemon = () => ALL_POKEMON[Math.floor(Math.random() * ALL_POKEMON.length)];

// Get Pokemon that look good as enemies (smaller ones for walkers, flying types for flyers)
const getWalkerPokemon = () => {
  const walkers = ALL_POKEMON.filter(p =>
    p.height < 20 && // Under 2 meters
    !p.types.includes('flying') &&
    !p.is_legendary &&
    !p.is_mythical
  );
  return walkers[Math.floor(Math.random() * walkers.length)] || getRandomPokemon();
};

const getFlyerPokemon = () => {
  const flyers = ALL_POKEMON.filter(p =>
    p.types.includes('flying') ||
    p.types.includes('ghost') ||
    p.types.includes('psychic') ||
    p.shape === 'ball' ||
    p.name.toLowerCase().includes('float')
  );
  return flyers[Math.floor(Math.random() * flyers.length)] || getRandomPokemon();
};

const getBossPokemon = () => {
  const bosses = ALL_POKEMON.filter(p =>
    p.is_legendary ||
    p.is_mythical ||
    p.height > 20 ||
    p.base_experience > 200
  );
  return bosses[Math.floor(Math.random() * bosses.length)] || getRandomPokemon();
};

// Helper to generate unique IDs
let idCounter = 0;
const generateId = () => `obj_${++idCounter}`;

// Level themes with colors
const THEMES = [
  { name: 'grassland', sky: ['#87CEEB', '#98FB98'], platformType: 'grass' as const },
  { name: 'underground', sky: ['#1a1a2e', '#16213e'], platformType: 'stone' as const },
  { name: 'sky', sky: ['#87CEEB', '#ffffff'], platformType: 'cloud' as const },
  { name: 'water', sky: ['#006994', '#40E0D0'], platformType: 'ice' as const },
  { name: 'castle', sky: ['#2d2d2d', '#4a4a4a'], platformType: 'brick' as const },
  { name: 'forest', sky: ['#228B22', '#90EE90'], platformType: 'grass' as const },
];

// Fun level name parts
const LEVEL_PREFIXES = [
  'Wild', 'Mystic', 'Ancient', 'Secret', 'Hidden', 'Magical', 'Sunny', 'Misty',
  'Crystal', 'Rainbow', 'Golden', 'Silver', 'Sparkling', 'Enchanted', 'Wonder'
];
const LEVEL_SUFFIXES = [
  'Fields', 'Valley', 'Mountain', 'Forest', 'Cave', 'Sky', 'Island', 'Beach',
  'Garden', 'Meadow', 'Hills', 'Plains', 'Kingdom', 'Paradise', 'World'
];

// Generate a random level name
const generateLevelName = (levelNum: number) => {
  const prefix = LEVEL_PREFIXES[Math.floor(Math.random() * LEVEL_PREFIXES.length)];
  const suffix = LEVEL_SUFFIXES[Math.floor(Math.random() * LEVEL_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
};

// Create a platform
const createPlatform = (
  x: number,
  y: number,
  width: number,
  type: Platform['type'] = 'grass'
): Platform => ({
  id: generateId(),
  x: x * TILE_SIZE,
  y: y * TILE_SIZE,
  width: width * TILE_SIZE,
  height: TILE_SIZE,
  type,
});

// Create an enemy using a random Pokemon
const createEnemy = (x: number, y: number, type: EnemyType = 'walker'): Enemy => {
  const poke = type === 'walker' ? getWalkerPokemon() :
               type === 'flyer' ? getFlyerPokemon() : getBossPokemon();
  return {
    id: generateId(),
    x: x * TILE_SIZE,
    y: y * TILE_SIZE,
    width: 40,
    height: 40,
    velocity: { x: 1 + Math.random(), y: 0 },
    isActive: true,
    pokemon: {
      id: poke.id,
      name: poke.name,
      image: poke.image,
      jumpPower: 10,
      speed: 2,
      color: poke.color || '#666',
    },
    type,
    direction: Math.random() > 0.5 ? 1 : -1,
    isDefeated: false,
    patrolRange: 80 + Math.random() * 120,
    startX: x * TILE_SIZE,
  };
};

// Create a collectible
const createCollectible = (x: number, y: number): Collectible => {
  const types: Collectible['type'][] = ['pokeball', 'pokeball', 'pokeball', 'greatball', 'ultraball'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    id: generateId(),
    x: x * TILE_SIZE,
    y: y * TILE_SIZE,
    width: 30,
    height: 30,
    type,
    isCollected: false,
    value: type === 'pokeball' ? 1 : type === 'greatball' ? 5 : 10,
    floatOffset: Math.random() * Math.PI * 2,
  };
};

// Create a power-up
const createPowerUp = (x: number, y: number): PowerUp => {
  const types: PowerUp['type'][] = ['speedBoost', 'superJump', 'invincible'];
  return {
    id: generateId(),
    x: x * TILE_SIZE,
    y: y * TILE_SIZE,
    width: 35,
    height: 35,
    type: types[Math.floor(Math.random() * types.length)],
    isCollected: false,
  };
};

// PROCEDURAL LEVEL GENERATOR
export const generateLevel = (levelNum: number): Level => {
  // Reset ID counter for fresh level
  idCounter = levelNum * 10000;

  // Pick a random theme
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

  // Level gets longer as you progress (but not too crazy)
  const baseWidth = 2500 + Math.min(levelNum * 200, 2000);
  const width = baseWidth + Math.random() * 500;
  const height = 600;

  const platforms: Platform[] = [];
  const enemies: Enemy[] = [];
  const collectibles: Collectible[] = [];
  const powerUps: PowerUp[] = [];

  // Generate ground - mostly continuous with small gaps
  let groundX = 0;
  while (groundX < width / TILE_SIZE - 5) {
    const segmentWidth = 8 + Math.floor(Math.random() * 12);
    platforms.push(createPlatform(groundX, 14, segmentWidth, theme.platformType));
    groundX += segmentWidth + (Math.random() > 0.7 ? 1 : 0); // Tiny gaps sometimes
  }

  // Generate floating platforms at various heights
  const numFloatingPlatforms = 15 + Math.floor(levelNum / 2) + Math.floor(Math.random() * 10);
  for (let i = 0; i < numFloatingPlatforms; i++) {
    const x = 5 + Math.floor(Math.random() * (width / TILE_SIZE - 10));
    const y = 5 + Math.floor(Math.random() * 8); // Heights 5-12
    const w = 3 + Math.floor(Math.random() * 4);
    const isBouncy = Math.random() > 0.6;
    platforms.push(createPlatform(x, y, w, isBouncy ? 'bounce' : theme.platformType));
  }

  // Generate enemies - more as levels progress
  const numEnemies = 4 + Math.floor(levelNum / 3) + Math.floor(Math.random() * 4);
  for (let i = 0; i < numEnemies; i++) {
    const x = 10 + Math.floor(Math.random() * (width / TILE_SIZE - 20));
    const isFlyer = Math.random() > 0.6;
    const y = isFlyer ? (4 + Math.floor(Math.random() * 6)) : 13;
    enemies.push(createEnemy(x, y, isFlyer ? 'flyer' : 'walker'));
  }

  // Generate collectibles scattered around
  const numCollectibles = 10 + Math.floor(Math.random() * 10);
  for (let i = 0; i < numCollectibles; i++) {
    const x = 5 + Math.floor(Math.random() * (width / TILE_SIZE - 10));
    const y = 4 + Math.floor(Math.random() * 9);
    collectibles.push(createCollectible(x, y));
  }

  // Generate power-ups
  const numPowerUps = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numPowerUps; i++) {
    const x = 15 + Math.floor(Math.random() * (width / TILE_SIZE - 30));
    const y = 3 + Math.floor(Math.random() * 6);
    powerUps.push(createPowerUp(x, y));
  }

  return {
    id: levelNum,
    name: generateLevelName(levelNum),
    theme: theme.name as Level['theme'],
    width: Math.floor(width),
    height,
    startPosition: { x: 50, y: 400 },
    goalPosition: { x: Math.floor(width) - 150, y: 400 },
    platforms,
    enemies,
    collectibles,
    powerUps,
    backgroundLayers: [],
  };
};

// For compatibility - generate level on demand
export const getLevel = (id: number): Level => generateLevel(id);

// Endless levels!
export const getTotalLevels = (): number => Infinity;

// Reset for new game
export const resetLevelIds = () => {
  idCounter = 0;
};
