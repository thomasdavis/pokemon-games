// Game constants for Pokemon Mario

export const GAME_CONFIG = {
  // Canvas/viewport
  VIEWPORT_WIDTH: 800,
  VIEWPORT_HEIGHT: 600,
  TILE_SIZE: 40,

  // Physics - floatier for kids!
  GRAVITY: 0.45,
  MAX_FALL_SPEED: 12,
  FRICTION: 0.85,
  AIR_RESISTANCE: 0.95,

  // Player defaults - made easier for kids!
  PLAYER_WIDTH: 40,
  PLAYER_HEIGHT: 50,
  PLAYER_SPEED: 6,
  PLAYER_JUMP_POWER: 16,  // Higher jumps!
  PLAYER_MAX_SPEED: 9,
  STARTING_LIVES: 99,  // Basically infinite

  // Power-up durations (in frames, 60fps)
  INVINCIBLE_DURATION: 600,  // 10 seconds
  SPEED_BOOST_DURATION: 480, // 8 seconds
  FIRE_POWER_DURATION: 900,  // 15 seconds

  // Scoring
  ENEMY_DEFEAT_SCORE: 100,
  POKEBALL_SCORE: 10,
  GREATBALL_SCORE: 25,
  ULTRABALL_SCORE: 50,
  MASTERBALL_SCORE: 200,
  LEVEL_COMPLETE_BONUS: 1000,
  LIFE_BONUS_THRESHOLD: 100, // coins for extra life

  // Camera
  CAMERA_LEAD: 200,
  CAMERA_SMOOTHING: 0.1,

  // Animation
  ANIMATION_SPEED: 8,
  PARTICLE_LIMIT: 100,
};

export const COLORS = {
  // Platform colors by type
  platforms: {
    grass: '#4ade80',
    stone: '#9ca3af',
    brick: '#f97316',
    cloud: '#e0f2fe',
    ice: '#7dd3fc',
    bounce: '#f472b6',
    breakable: '#fbbf24',
  },

  // Level themes
  themes: {
    grassland: {
      sky: ['#87CEEB', '#98FB98'],
      ground: '#8B4513',
    },
    underground: {
      sky: ['#1a1a2e', '#16213e'],
      ground: '#2d2d2d',
    },
    sky: {
      sky: ['#87CEEB', '#ffffff'],
      ground: '#87CEEB',
    },
    water: {
      sky: ['#006994', '#40E0D0'],
      ground: '#0077be',
    },
    castle: {
      sky: ['#2d2d2d', '#4a4a4a'],
      ground: '#1a1a1a',
    },
    forest: {
      sky: ['#228B22', '#90EE90'],
      ground: '#2d5a27',
    },
  },

  // UI colors
  ui: {
    health: '#ef4444',
    score: '#fbbf24',
    coins: '#f59e0b',
    time: '#ffffff',
  },

  // Particle colors
  particles: {
    sparkle: ['#ffd700', '#ffec8b', '#fff8dc'],
    dust: ['#d4a574', '#c4956a', '#b4865f'],
    explosion: ['#ff4500', '#ff6347', '#ffa500'],
  },
};

// Dynamic Pokemon characters - will be generated from the full database!
// This is just a fallback set - the game uses all 1008 Pokemon
export const POKEMON_CHARACTERS = {
  pikachu: { id: 25, name: 'Pikachu', image: '/pokemon/25.png', jumpPower: 14, speed: 5, color: '#f7d02c' },
  charmander: { id: 4, name: 'Charmander', image: '/pokemon/4.png', jumpPower: 13, speed: 5.5, color: '#ff9c54' },
  squirtle: { id: 7, name: 'Squirtle', image: '/pokemon/7.png', jumpPower: 12, speed: 4.5, color: '#5090d6' },
  bulbasaur: { id: 1, name: 'Bulbasaur', image: '/pokemon/1.png', jumpPower: 13, speed: 4.8, color: '#64d97b' },
  eevee: { id: 133, name: 'Eevee', image: '/pokemon/133.png', jumpPower: 15, speed: 5.2, color: '#c6a679' },
  jigglypuff: { id: 39, name: 'Jigglypuff', image: '/pokemon/39.png', jumpPower: 16, speed: 4, color: '#ffa0c0' },
  meowth: { id: 52, name: 'Meowth', image: '/pokemon/52.png', jumpPower: 14, speed: 5.5, color: '#f5d16e' },
  psyduck: { id: 54, name: 'Psyduck', image: '/pokemon/54.png', jumpPower: 12, speed: 4.5, color: '#f8d030' },
  mew: { id: 151, name: 'Mew', image: '/pokemon/151.png', jumpPower: 16, speed: 6, color: '#f0a0c0' },
};

export const ENEMY_POKEMON = [
  // Walkers - ground enemies
  { id: 19, name: 'Rattata', type: 'walker' as const },
  { id: 20, name: 'Raticate', type: 'walker' as const },
  { id: 23, name: 'Ekans', type: 'walker' as const },
  { id: 24, name: 'Arbok', type: 'walker' as const },
  { id: 27, name: 'Sandshrew', type: 'walker' as const },
  { id: 29, name: 'Nidoran♀', type: 'walker' as const },
  { id: 32, name: 'Nidoran♂', type: 'walker' as const },
  { id: 37, name: 'Vulpix', type: 'walker' as const },
  { id: 43, name: 'Oddish', type: 'walker' as const },
  { id: 46, name: 'Paras', type: 'walker' as const },
  { id: 48, name: 'Venonat', type: 'walker' as const },
  { id: 50, name: 'Diglett', type: 'walker' as const },
  { id: 56, name: 'Mankey', type: 'walker' as const },
  { id: 60, name: 'Poliwag', type: 'walker' as const },
  { id: 69, name: 'Bellsprout', type: 'walker' as const },
  { id: 72, name: 'Tentacool', type: 'walker' as const },
  { id: 74, name: 'Geodude', type: 'walker' as const },
  { id: 79, name: 'Slowpoke', type: 'walker' as const },
  { id: 84, name: 'Doduo', type: 'walker' as const },
  { id: 88, name: 'Grimer', type: 'walker' as const },
  { id: 96, name: 'Drowzee', type: 'walker' as const },
  { id: 98, name: 'Krabby', type: 'walker' as const },
  { id: 100, name: 'Voltorb', type: 'walker' as const },
  { id: 102, name: 'Exeggcute', type: 'walker' as const },
  { id: 108, name: 'Lickitung', type: 'walker' as const },
  { id: 111, name: 'Rhyhorn', type: 'walker' as const },
  { id: 116, name: 'Horsea', type: 'walker' as const },
  { id: 118, name: 'Goldeen', type: 'walker' as const },
  { id: 120, name: 'Staryu', type: 'walker' as const },
  { id: 129, name: 'Magikarp', type: 'walker' as const },
  { id: 138, name: 'Omanyte', type: 'walker' as const },
  { id: 140, name: 'Kabuto', type: 'walker' as const },

  // Flyers - flying enemies
  { id: 41, name: 'Zubat', type: 'flyer' as const },
  { id: 42, name: 'Golbat', type: 'flyer' as const },
  { id: 16, name: 'Pidgey', type: 'flyer' as const },
  { id: 17, name: 'Pidgeotto', type: 'flyer' as const },
  { id: 21, name: 'Spearow', type: 'flyer' as const },
  { id: 49, name: 'Venomoth', type: 'flyer' as const },
  { id: 83, name: 'Farfetchd', type: 'flyer' as const },
  { id: 92, name: 'Gastly', type: 'flyer' as const },
  { id: 93, name: 'Haunter', type: 'flyer' as const },
  { id: 109, name: 'Koffing', type: 'flyer' as const },
  { id: 110, name: 'Weezing', type: 'flyer' as const },
  { id: 12, name: 'Butterfree', type: 'flyer' as const },
  { id: 123, name: 'Scyther', type: 'flyer' as const },

  // Bosses - larger, tougher enemies
  { id: 95, name: 'Onix', type: 'boss' as const },
  { id: 94, name: 'Gengar', type: 'boss' as const },
  { id: 34, name: 'Nidoking', type: 'boss' as const },
  { id: 31, name: 'Nidoqueen', type: 'boss' as const },
  { id: 59, name: 'Arcanine', type: 'boss' as const },
  { id: 65, name: 'Alakazam', type: 'boss' as const },
  { id: 68, name: 'Machamp', type: 'boss' as const },
  { id: 76, name: 'Golem', type: 'boss' as const },
  { id: 112, name: 'Rhydon', type: 'boss' as const },
  { id: 130, name: 'Gyarados', type: 'boss' as const },
  { id: 142, name: 'Aerodactyl', type: 'boss' as const },
  { id: 149, name: 'Dragonite', type: 'boss' as const },
];

export const SOUND_EFFECTS = {
  jump: 'jump',
  coin: 'coin',
  powerUp: 'powerup',
  enemyDefeat: 'defeat',
  hurt: 'hurt',
  levelComplete: 'complete',
  gameOver: 'gameover',
};
