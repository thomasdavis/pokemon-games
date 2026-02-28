// Pokemon Starblast - Game Constants

import { pokemonById, typeColors } from '@/data/pokemon';
import { PlayerShip, PlayerShipId } from '../types';

// ============ Game Dimensions ============

export const GAME_CONFIG = {
  // Canvas dimensions
  VIEWPORT_WIDTH: 800,
  VIEWPORT_HEIGHT: 600,

  // Player settings
  PLAYER_WIDTH: 48,
  PLAYER_HEIGHT: 48,
  PLAYER_START_X: 400,
  PLAYER_START_Y: 500,
  PLAYER_BASE_SPEED: 350, // pixels per second
  PLAYER_BASE_HEALTH: 100,
  PLAYER_INVINCIBLE_TIME: 1.5, // seconds after being hit
  PLAYER_FIRE_RATE: 8, // base shots per second

  // Projectile settings
  PROJECTILE_WIDTH: 8,
  PROJECTILE_HEIGHT: 16,
  PROJECTILE_SPEED: 600, // pixels per second
  PROJECTILE_DAMAGE: 10,
  ENEMY_PROJECTILE_SPEED: 300,

  // Enemy settings
  ENEMY_MIN_SIZE: 32,
  ENEMY_MAX_SIZE: 48,

  // Boss settings
  BOSS_WIDTH: 128,
  BOSS_HEIGHT: 128,

  // Power-up settings
  POWERUP_SIZE: 32,
  POWERUP_FALL_SPEED: 80,
  POWERUP_SPAWN_CHANCE: 0.15, // 15% chance on enemy death

  // Combo settings
  COMBO_TIMEOUT: 3, // seconds
  COMBO_MULTIPLIER_INCREMENT: 0.1,
  MAX_COMBO_MULTIPLIER: 5.0,

  // Graze settings
  GRAZE_DISTANCE: 24, // pixels from projectile center
  GRAZE_POINTS: 50,

  // Wave settings
  WAVE_INTRO_DURATION: 3, // seconds
  BOSS_INTRO_DURATION: 4, // seconds
  WAVE_COMPLETE_DELAY: 2, // seconds

  // Difficulty scaling
  ENEMY_HEALTH_SCALE: 1.1, // +10% per wave
  ENEMY_SPEED_SCALE: 1.03, // +3% per wave
  SPAWN_RATE_SCALE: 1.05, // +5% per wave
  SCORE_SCALE: 1.15, // +15% per wave

  // Particle limits
  MAX_PARTICLES: 200,
  MAX_PROJECTILES: 100,

  // Screen effects
  MAX_SCREEN_SHAKE: 10,
  SCREEN_SHAKE_DECAY: 0.9,
  SLOW_MO_FACTOR: 0.3,
  SLOW_MO_DURATION: 1, // seconds

  // Spawn zones
  SPAWN_MARGIN_TOP: -60,
  SPAWN_MARGIN_SIDES: 50,
};

// ============ Player Ships ============

export const PLAYER_SHIPS: Record<PlayerShipId, PlayerShip> = {
  pikachu: {
    id: 'pikachu',
    name: 'Pikachu',
    pokemon: pokemonById.get(25)!,
    color: '#F8D030',
    speed: 400,
    health: 100,
    fireRate: 9,
    damage: 10,
    specialAbility: {
      name: 'Chain Lightning',
      description: 'Damage spreads to nearby enemies',
      cooldown: 8,
      duration: 0,
      effect: 'chain_lightning',
    },
    description: 'Fast ship with chain lightning special',
  },
  charmander: {
    id: 'charmander',
    name: 'Charmander',
    pokemon: pokemonById.get(4)!,
    color: '#F08030',
    speed: 350,
    health: 100,
    fireRate: 8,
    damage: 12,
    specialAbility: {
      name: 'Flame Burst',
      description: 'Burns enemies for damage over time',
      cooldown: 10,
      duration: 5,
      effect: 'burn_dot',
    },
    description: 'Balanced ship with burn damage',
  },
  squirtle: {
    id: 'squirtle',
    name: 'Squirtle',
    pokemon: pokemonById.get(7)!,
    color: '#6890F0',
    speed: 280,
    health: 140,
    fireRate: 7,
    damage: 11,
    specialAbility: {
      name: 'Hydro Pump',
      description: 'Slows enemies hit by your shots',
      cooldown: 12,
      duration: 6,
      effect: 'slow_field',
    },
    description: 'Tanky ship with slowing ability',
  },
  bulbasaur: {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    pokemon: pokemonById.get(1)!,
    color: '#78C850',
    speed: 320,
    health: 120,
    fireRate: 7,
    damage: 9,
    specialAbility: {
      name: 'Leech Seed',
      description: 'Heal when killing enemies',
      cooldown: 15,
      duration: 8,
      effect: 'heal_on_kill',
    },
    description: 'Sustain ship with healing',
  },
  eevee: {
    id: 'eevee',
    name: 'Eevee',
    pokemon: pokemonById.get(133)!,
    color: '#C6A659',
    speed: 380,
    health: 80,
    fireRate: 10,
    damage: 14,
    specialAbility: {
      name: 'Adaptability',
      description: 'Deal extra damage to current wave type',
      cooldown: 6,
      duration: 4,
      effect: 'copy_type',
    },
    description: 'Glass cannon with type advantage',
  },
};

// ============ Scoring ============

export const SCORING = {
  ENEMY_BASE: 100,
  BOSS_HIT: 10,
  BOSS_DEFEAT_MULTIPLIER: 5000, // × boss number (1-5)
  GRAZE: 50,
  POWERUP: 200,
  PERFECT_WAVE_MULTIPLIER: 2,
  NO_DAMAGE_BONUS: 500,
};

// ============ Colors ============

export const COLORS = {
  // UI colors
  health: '#ef4444',
  healthBg: '#7f1d1d',
  shield: '#3b82f6',
  special: '#a855f7',
  specialReady: '#22c55e',
  combo: '#f59e0b',
  score: '#ffffff',

  // Particle colors by type
  particles: {
    explosion: '#ff6b35',
    spark: '#ffd93d',
    flame: '#ff4500',
    ice: '#87ceeb',
    electric: '#ffff00',
    water: '#1e90ff',
    thruster: '#00aaff',
    star: '#ffffff',
    combo: '#ff00ff',
    graze: '#00ff00',
    heal: '#00ff88',
    damage: '#ff0000',
  },

  // Type colors (reexport for convenience)
  types: typeColors,

  // Boss aura colors
  bossAura: {
    articuno: '#87ceeb',
    zapdos: '#ffd93d',
    moltres: '#ff6b35',
    mewtwo: '#a855f7',
    rayquaza: '#22c55e',
  },

  // Background
  spaceGradient: ['#0a0a1a', '#1a1a3a', '#0a0a1a'],
};

// ============ Enemy Behaviors ============

export const ENEMY_BEHAVIORS = {
  diver: {
    name: 'Diver',
    description: 'Dives straight down',
    baseSpeed: 200,
  },
  weaver: {
    name: 'Weaver',
    description: 'Weaves side to side while descending',
    baseSpeed: 150,
    weaveMagnitude: 100,
    weaveFrequency: 2,
  },
  swooper: {
    name: 'Swooper',
    description: 'Swoops in arcs',
    baseSpeed: 180,
  },
  bomber: {
    name: 'Bomber',
    description: 'Drops projectiles below',
    baseSpeed: 100,
    fireRate: 1,
  },
  sniper: {
    name: 'Sniper',
    description: 'Aims at player and fires',
    baseSpeed: 80,
    fireRate: 0.5,
  },
  circler: {
    name: 'Circler',
    description: 'Circles around the screen',
    baseSpeed: 120,
    circleRadius: 80,
  },
  charger: {
    name: 'Charger',
    description: 'Charges at the player',
    baseSpeed: 300,
    chargeDelay: 1.5,
  },
};

// ============ Power-up Settings ============

export const POWERUP_CONFIG = {
  health: {
    name: 'Health Pack',
    color: '#ef4444',
    emoji: '❤️',
    healAmount: 30,
  },
  spread: {
    name: 'Spread Shot',
    color: '#f59e0b',
    emoji: '🔥',
    duration: 15,
    spreadCount: 3,
    spreadAngle: 15, // degrees
  },
  laser: {
    name: 'Laser Beam',
    color: '#ef4444',
    emoji: '⚡',
    duration: 10,
    damageMultiplier: 0.5, // continuous damage
  },
  homing: {
    name: 'Homing Missiles',
    color: '#8b5cf6',
    emoji: '🎯',
    duration: 12,
    turnRate: 180, // degrees per second
  },
  piercing: {
    name: 'Piercing Shots',
    color: '#06b6d4',
    emoji: '💠',
    duration: 10,
    maxPierces: 3,
  },
  shield: {
    name: 'Shield',
    color: '#3b82f6',
    emoji: '🛡️',
    duration: 8,
  },
  speed: {
    name: 'Speed Boost',
    color: '#22c55e',
    emoji: '💨',
    duration: 10,
    speedMultiplier: 1.5,
  },
  rapid: {
    name: 'Rapid Fire',
    color: '#ec4899',
    emoji: '🔫',
    duration: 12,
    fireRateMultiplier: 2,
  },
};

// ============ Audio Settings ============

export const AUDIO_CONFIG = {
  // Master volumes
  masterVolume: 0.7,
  musicVolume: 0.4,
  sfxVolume: 0.8,

  // Sound mappings
  sounds: {
    shoot: { sound: 'pop' as const, volume: 0.4, rate: 1.5 },
    enemyHit: { sound: 'pop' as const, volume: 0.5, rate: 1.2 },
    enemyDeath: { sound: 'pop' as const, volume: 0.6, rate: 1.0 },
    playerHit: { sound: 'error' as const, volume: 0.8, rate: 1.0 },
    powerUp: { sound: 'powerup' as const, volume: 0.8, rate: 1.0 },
    bossSpawn: { sound: 'powerup' as const, volume: 1.0, rate: 0.7 },
    bossHit: { sound: 'pop' as const, volume: 0.5, rate: 0.8 },
    bossDefeat: { sound: 'win' as const, volume: 1.0, rate: 1.0 },
    waveComplete: { sound: 'powerup' as const, volume: 0.9, rate: 1.0 },
    gameOver: { sound: 'lose' as const, volume: 0.9, rate: 1.0 },
    combo5: { sound: 'ding' as const, volume: 0.6, rate: 1.0 },
    combo10: { sound: 'match' as const, volume: 0.7, rate: 1.1 },
    combo25: { sound: 'combo' as const, volume: 0.8, rate: 1.2 },
    combo50: { sound: 'streak' as const, volume: 1.0, rate: 1.3 },
    special: { sound: 'whoosh' as const, volume: 0.8, rate: 1.0 },
    graze: { sound: 'ding' as const, volume: 0.3, rate: 1.5 },
  },
};

// ============ Speech Profiles ============

export const SPEECH_PROFILES = {
  waveAnnouncement: { rate: 1.1, pitch: 0.9, volume: 1.0 },
  bossIntro: { rate: 0.7, pitch: 0.5, volume: 1.0 },
  bossTaunt: { rate: 0.8, pitch: 0.7, volume: 1.0 },
  bossDefeat: { rate: 0.9, pitch: 0.8, volume: 1.0 },
  victory: { rate: 1.2, pitch: 1.3, volume: 1.0 },
  defeat: { rate: 0.8, pitch: 0.9, volume: 1.0 },
  combo: { rate: 1.2, pitch: 1.2, volume: 0.9 },
  powerUp: { rate: 1.3, pitch: 1.2, volume: 0.8 },
  warning: { rate: 1.0, pitch: 1.0, volume: 1.0 },
};

// ============ Wave Type Themes ============

export const WAVE_THEMES: Record<string, { background: string; accent: string }> = {
  normal: { background: '#A8A878', accent: '#D3D3AC' },
  fire: { background: '#F08030', accent: '#FFA040' },
  water: { background: '#6890F0', accent: '#78A8FF' },
  electric: { background: '#F8D030', accent: '#FFE860' },
  grass: { background: '#78C850', accent: '#90D868' },
  ice: { background: '#98D8D8', accent: '#B0F0F0' },
  fighting: { background: '#C03028', accent: '#E04038' },
  poison: { background: '#A040A0', accent: '#C050C0' },
  ground: { background: '#E0C068', accent: '#F0D080' },
  flying: { background: '#A890F0', accent: '#C0A8FF' },
  psychic: { background: '#F85888', accent: '#FF78A8' },
  bug: { background: '#A8B820', accent: '#C0D030' },
  rock: { background: '#B8A038', accent: '#D0B848' },
  ghost: { background: '#705898', accent: '#8868B8' },
  dragon: { background: '#7038F8', accent: '#9058FF' },
  dark: { background: '#705848', accent: '#906858' },
  steel: { background: '#B8B8D0', accent: '#D0D0E8' },
  fairy: { background: '#EE99AC', accent: '#FFB0C0' },
};
