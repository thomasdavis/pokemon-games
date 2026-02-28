// Pokemon Starblast - Power-up System

import { PowerUp, PowerUpType, PlayerState, WeaponType } from '../types';
import { GAME_CONFIG, POWERUP_CONFIG } from './constants';

// ============ Power-up Creation ============

export function createPowerUp(
  x: number,
  y: number,
  type?: PowerUpType
): PowerUp {
  // If no type specified, randomly select one
  const powerUpType = type || getRandomPowerUpType();

  return {
    id: `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    width: GAME_CONFIG.POWERUP_SIZE,
    height: GAME_CONFIG.POWERUP_SIZE,
    velocity: { x: 0, y: GAME_CONFIG.POWERUP_FALL_SPEED },
    isActive: true,
    type: powerUpType,
    duration: getPowerUpDuration(powerUpType),
  };
}

// ============ Random Power-up Selection ============

const POWERUP_WEIGHTS: Record<PowerUpType, number> = {
  health: 25,    // Most common
  spread: 15,
  laser: 10,
  homing: 10,
  piercing: 10,
  shield: 8,
  speed: 12,
  rapid: 10,
};

export function getRandomPowerUpType(): PowerUpType {
  const totalWeight = Object.values(POWERUP_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(POWERUP_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return type as PowerUpType;
    }
  }

  return 'health'; // Fallback
}

// ============ Power-up Properties ============

export function getPowerUpDuration(type: PowerUpType): number | undefined {
  const config = POWERUP_CONFIG[type];
  return 'duration' in config ? config.duration : undefined;
}

export function getPowerUpColor(type: PowerUpType): string {
  return POWERUP_CONFIG[type].color;
}

export function getPowerUpEmoji(type: PowerUpType): string {
  return POWERUP_CONFIG[type].emoji;
}

export function getPowerUpName(type: PowerUpType): string {
  return POWERUP_CONFIG[type].name;
}

// ============ Apply Power-up Effects ============

export interface PowerUpEffect {
  player: Partial<PlayerState>;
  message: string;
  duration?: number;
}

export function applyPowerUp(
  player: PlayerState,
  powerUp: PowerUp
): PowerUpEffect {
  const config = POWERUP_CONFIG[powerUp.type];

  switch (powerUp.type) {
    case 'health': {
      const healAmount = 'healAmount' in config ? config.healAmount : 30;
      const newHealth = Math.min(player.maxHealth, player.health + healAmount);
      return {
        player: { health: newHealth },
        message: `+${healAmount} Health!`,
      };
    }

    case 'spread': {
      return {
        player: {
          weapon: 'spread',
          weaponPower: 1,
        },
        message: 'Spread Shot!',
        duration: 'duration' in config ? config.duration : 15,
      };
    }

    case 'laser': {
      return {
        player: {
          weapon: 'laser',
          weaponPower: 1,
        },
        message: 'Laser Beam!',
        duration: 'duration' in config ? config.duration : 10,
      };
    }

    case 'homing': {
      return {
        player: {
          weapon: 'homing',
          weaponPower: 1,
        },
        message: 'Homing Missiles!',
        duration: 'duration' in config ? config.duration : 12,
      };
    }

    case 'piercing': {
      return {
        player: {
          weapon: 'piercing',
          weaponPower: 1,
        },
        message: 'Piercing Shots!',
        duration: 'duration' in config ? config.duration : 10,
      };
    }

    case 'shield': {
      return {
        player: {
          isInvincible: true,
          invincibleTimer: 'duration' in config ? config.duration : 8,
        },
        message: 'Shield Active!',
        duration: 'duration' in config ? config.duration : 8,
      };
    }

    case 'speed': {
      const speedMultiplier = 'speedMultiplier' in config ? config.speedMultiplier : 1.5;
      return {
        player: {
          // Speed handled in movement calculation
        },
        message: 'Speed Boost!',
        duration: 'duration' in config ? config.duration : 10,
      };
    }

    case 'rapid': {
      return {
        player: {
          // Fire rate handled in shooting calculation
        },
        message: 'Rapid Fire!',
        duration: 'duration' in config ? config.duration : 12,
      };
    }

    default:
      return {
        player: {},
        message: 'Power Up!',
      };
  }
}

// ============ Active Power-up Tracking ============

export interface ActivePowerUp {
  type: PowerUpType;
  timeRemaining: number;
  totalDuration: number;
}

export function updateActivePowerUps(
  powerUps: ActivePowerUp[],
  delta: number
): ActivePowerUp[] {
  return powerUps
    .map(p => ({
      ...p,
      timeRemaining: p.timeRemaining - delta,
    }))
    .filter(p => p.timeRemaining > 0);
}

export function hasPowerUp(powerUps: ActivePowerUp[], type: PowerUpType): boolean {
  return powerUps.some(p => p.type === type);
}

export function getPowerUpTimeRemaining(
  powerUps: ActivePowerUp[],
  type: PowerUpType
): number {
  const powerUp = powerUps.find(p => p.type === type);
  return powerUp ? powerUp.timeRemaining : 0;
}

// ============ Weapon from Power-ups ============

export function getActiveWeapon(powerUps: ActivePowerUp[]): WeaponType {
  // Priority order for weapons
  const weaponPriority: WeaponType[] = ['laser', 'homing', 'piercing', 'spread'];

  for (const weapon of weaponPriority) {
    if (hasPowerUp(powerUps, weapon as PowerUpType)) {
      return weapon;
    }
  }

  return 'basic';
}

export function getFireRateMultiplier(powerUps: ActivePowerUp[]): number {
  if (hasPowerUp(powerUps, 'rapid')) {
    return POWERUP_CONFIG.rapid.fireRateMultiplier;
  }
  return 1;
}

export function getSpeedMultiplier(powerUps: ActivePowerUp[]): number {
  if (hasPowerUp(powerUps, 'speed')) {
    return POWERUP_CONFIG.speed.speedMultiplier;
  }
  return 1;
}

// ============ Should Spawn Power-up ============

export function shouldSpawnPowerUp(): boolean {
  return Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE;
}

// ============ Power-up Animation ============

export function getPowerUpBobOffset(time: number): number {
  return Math.sin(time * 3) * 4;
}

export function getPowerUpRotation(time: number): number {
  return (time * 90) % 360; // Degrees
}

export function getPowerUpScale(time: number): number {
  return 1 + Math.sin(time * 4) * 0.1;
}
