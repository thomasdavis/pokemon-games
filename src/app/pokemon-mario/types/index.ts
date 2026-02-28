// Core game types for Pokemon Mario

export interface Vector2D {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameObject extends Bounds {
  id: string;
  velocity: Vector2D;
  isActive: boolean;
}

export interface PlayerState extends GameObject {
  pokemon: PokemonCharacter;
  lives: number;
  coins: number;
  score: number;
  isJumping: boolean;
  isGrounded: boolean;
  isFacingRight: boolean;
  isInvincible: boolean;
  invincibleTimer: number;
  powerUp: PowerUpType | null;
  canDoubleJump: boolean;
  hasDoubleJumped: boolean;
}

export interface PokemonCharacter {
  id: number;
  name: string;
  image: string;
  jumpPower: number;
  speed: number;
  color: string;
}

export interface Platform extends Bounds {
  id: string;
  type: PlatformType;
  isMoving?: boolean;
  moveRange?: number;
  moveSpeed?: number;
  moveDirection?: 'horizontal' | 'vertical';
}

export type PlatformType =
  | 'grass'
  | 'stone'
  | 'brick'
  | 'cloud'
  | 'ice'
  | 'bounce'
  | 'breakable';

export interface Enemy extends GameObject {
  pokemon: PokemonCharacter;
  type: EnemyType;
  direction: number;
  isDefeated: boolean;
  patrolRange?: number;
  startX?: number;
}

export type EnemyType =
  | 'walker'      // Basic walking enemy
  | 'jumper'      // Hops around
  | 'flyer'       // Flying enemy
  | 'shooter'     // Shoots projectiles
  | 'boss';       // Big boss enemy

export interface Collectible extends Bounds {
  id: string;
  type: CollectibleType;
  isCollected: boolean;
  value: number;
  floatOffset?: number;
}

export type CollectibleType =
  | 'pokeball'
  | 'greatball'
  | 'ultraball'
  | 'masterball'
  | 'berry'
  | 'star';

export interface PowerUp extends Bounds {
  id: string;
  type: PowerUpType;
  isCollected: boolean;
}

export type PowerUpType =
  | 'speedBoost'    // Run faster
  | 'superJump'     // Jump higher
  | 'doubleJump'    // Can double jump
  | 'invincible'    // Star power
  | 'firePower';    // Shoot fireballs

export interface Projectile extends GameObject {
  type: 'fireball' | 'enemyShot';
  damage: number;
  fromPlayer: boolean;
}

export interface Level {
  id: number;
  name: string;
  theme: LevelTheme;
  width: number;
  height: number;
  platforms: Platform[];
  enemies: Enemy[];
  collectibles: Collectible[];
  powerUps: PowerUp[];
  startPosition: Vector2D;
  goalPosition: Vector2D;
  backgroundLayers: BackgroundLayer[];
  music?: string;
}

export type LevelTheme =
  | 'grassland'
  | 'underground'
  | 'sky'
  | 'water'
  | 'castle'
  | 'forest';

export interface BackgroundLayer {
  color: string;
  elements: BackgroundElement[];
  parallaxSpeed: number;
}

export interface BackgroundElement {
  type: 'cloud' | 'mountain' | 'tree' | 'bush' | 'star' | 'pokemon';
  x: number;
  y: number;
  scale: number;
  pokemonId?: number;
}

export interface GameState {
  status: 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory';
  currentLevel: number;
  player: PlayerState;
  camera: Vector2D;
  time: number;
  particles: Particle[];
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'sparkle' | 'dust' | 'coin' | 'explosion' | 'trail';
}

export interface GameInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  action: boolean;
}

export interface CollisionResult {
  collided: boolean;
  direction: 'top' | 'bottom' | 'left' | 'right' | null;
  overlap: number;
}
