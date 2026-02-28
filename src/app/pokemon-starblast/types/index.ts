// Pokemon Starblast - Type Definitions

import { Pokemon } from '@/data/pokemon';

// ============ Core Game Types ============

export type GameStatus = 'menu' | 'playing' | 'paused' | 'waveIntro' | 'bossIntro' | 'gameOver' | 'victory';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: Vector2D;
  isActive: boolean;
}

// ============ Player Types ============

export type PlayerShipId = 'pikachu' | 'charmander' | 'squirtle' | 'bulbasaur' | 'eevee';

export interface PlayerShip {
  id: PlayerShipId;
  name: string;
  pokemon: Pokemon;
  color: string;
  speed: number;
  health: number;
  fireRate: number; // shots per second
  damage: number;
  specialAbility: SpecialAbility;
  description: string;
}

export interface SpecialAbility {
  name: string;
  description: string;
  cooldown: number; // in seconds
  duration: number; // in seconds (0 for instant)
  effect: SpecialEffectType;
}

export type SpecialEffectType =
  | 'chain_lightning' // Pikachu - damage spreads to nearby enemies
  | 'burn_dot'        // Charmander - enemies take damage over time
  | 'slow_field'      // Squirtle - slows enemies hit
  | 'heal_on_kill'    // Bulbasaur - heal when killing enemies
  | 'copy_type';      // Eevee - copies enemy type for bonus damage

export interface PlayerState extends Entity {
  ship: PlayerShip;
  health: number;
  maxHealth: number;
  score: number;
  combo: number;
  comboTimer: number; // seconds until combo resets
  comboMultiplier: number;
  specialCooldown: number; // seconds until special ready
  isSpecialActive: boolean;
  specialTimer: number;
  isInvincible: boolean;
  invincibleTimer: number;
  weapon: WeaponType;
  weaponPower: number;
  isFiring: boolean;
  lastFireTime: number;
  grazeCount: number;
}

// ============ Projectile Types ============

export type WeaponType = 'basic' | 'spread' | 'laser' | 'homing' | 'piercing';

export interface Projectile extends Entity {
  damage: number;
  isPlayerProjectile: boolean;
  type: WeaponType;
  piercing: boolean;
  hitEnemies: Set<string>; // IDs of enemies already hit (for piercing)
}

// ============ Enemy Types ============

export type EnemyBehavior = 'diver' | 'weaver' | 'swooper' | 'bomber' | 'sniper' | 'circler' | 'charger';

export interface EnemyDefinition {
  pokemon: Pokemon;
  behavior: EnemyBehavior;
  health: number;
  damage: number;
  speed: number;
  fireRate: number;
  scoreValue: number;
}

export interface Enemy extends Entity {
  pokemon: Pokemon;
  behavior: EnemyBehavior;
  health: number;
  maxHealth: number;
  damage: number;
  scoreValue: number;
  fireRate: number;
  lastFireTime: number;
  behaviorTimer: number;
  behaviorPhase: number;
  targetX?: number;
  targetY?: number;
  isBurning?: boolean;
  burnDamage?: number;
  burnTimer?: number;
  isSlowed?: boolean;
  slowTimer?: number;
}

// ============ Boss Types ============

export type BossId = 'articuno' | 'zapdos' | 'moltres' | 'mewtwo' | 'rayquaza';

export interface BossPhase {
  healthThreshold: number; // percentage (0-1)
  attackPattern: BossAttackPattern;
  attackSpeed: number; // multiplier
  movePattern: BossMovePattern;
  dialogue?: string; // what boss says on entering this phase
}

export type BossAttackPattern =
  | 'spread'       // fires bullets in spread pattern
  | 'beam'         // fires continuous beam
  | 'spiral'       // spiraling bullet pattern
  | 'aimed'        // bullets aimed at player
  | 'rain'         // bullets rain from top
  | 'reflect'      // creates shield that reflects player bullets
  | 'summon'       // summons minion enemies
  | 'storm';       // combination attack

export type BossMovePattern =
  | 'hover'        // stays in place
  | 'sway'         // moves side to side
  | 'chase'        // follows player
  | 'teleport'     // teleports to random positions
  | 'circle'       // circles around the arena
  | 'dive';        // occasional dive attacks

export interface BossDefinition {
  id: BossId;
  name: string;
  pokemon: Pokemon;
  waveNumber: number;
  phases: BossPhase[];
  maxHealth: number;
  introDialogue: string;
  defeatDialogue: string;
  revives?: boolean; // Moltres special - revives once
}

export interface BossState extends Entity {
  definition: BossDefinition;
  health: number;
  maxHealth: number;
  currentPhase: number;
  phaseTimer: number;
  attackTimer: number;
  moveTimer: number;
  isEnraged: boolean;
  hasRevived?: boolean;
  shieldActive?: boolean;
  shieldHealth?: number;
}

// ============ Power-up Types ============

export type PowerUpType =
  | 'health'        // Restore health
  | 'spread'        // Spread weapon
  | 'laser'         // Laser weapon
  | 'homing'        // Homing missiles
  | 'piercing'      // Piercing shots
  | 'shield'        // Temporary invincibility
  | 'speed'         // Move faster
  | 'rapid';        // Increased fire rate

export interface PowerUp extends Entity {
  type: PowerUpType;
  duration?: number; // for timed powerups
}

// ============ Particle Types ============

export type ParticleType =
  | 'explosion'
  | 'spark'
  | 'flame'
  | 'ice'
  | 'electric'
  | 'water'
  | 'thruster'
  | 'star'
  | 'combo'
  | 'graze'
  | 'heal'
  | 'damage';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  rotation?: number;
  rotationSpeed?: number;
  scale?: number;
  scaleDecay?: number;
  gravity?: number;
  alpha?: number;
}

// ============ Wave Types ============

export interface WaveDefinition {
  number: number;
  name: string;
  type: string; // Pokemon type theme (e.g., 'fire', 'water')
  enemies: WaveEnemy[];
  spawnDelay: number; // delay between enemy spawns
  bossWave: boolean;
  bossId?: BossId;
}

export interface WaveEnemy {
  pokemonId: number;
  behavior: EnemyBehavior;
  count: number;
  spawnPattern: SpawnPattern;
  delay?: number; // delay before this group spawns
}

export type SpawnPattern =
  | 'single'      // one at a time
  | 'wave'        // horizontal line
  | 'v-formation' // V shape
  | 'diagonal'    // diagonal line
  | 'random'      // random positions
  | 'swarm';      // all at once

// ============ Game State ============

export interface GameState {
  status: GameStatus;
  player: PlayerState | null;
  enemies: Enemy[];
  projectiles: Projectile[];
  powerUps: PowerUp[];
  particles: Particle[];
  boss: BossState | null;
  currentWave: number;
  waveEnemiesRemaining: number;
  waveEnemiesSpawned: number;
  waveTotalEnemies: number;
  spawnTimer: number;
  score: number;
  highScore: number;
  screenShake: number;
  slowMo: number;
  aiMessages: AIMessage[];
}

export interface AIMessage {
  id: string;
  text: string;
  type: 'wave' | 'boss' | 'taunt' | 'victory' | 'defeat' | 'combo';
  timestamp: number;
  duration: number;
}

// ============ Input Types ============

export interface GameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  special: boolean;
}

// ============ Audio Types ============

export interface SoundLayer {
  id: string;
  audio: HTMLAudioElement | null;
  volume: number;
  isPlaying: boolean;
}

export interface SpeechProfile {
  rate: number;
  pitch: number;
  volume: number;
}

// ============ Utility Types ============

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Collision {
  collided: boolean;
  penetration?: Vector2D;
}
