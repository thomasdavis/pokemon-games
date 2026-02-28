// Pokemon Starblast - Boss Definitions

import { BossDefinition, BossPhase, BossState, Vector2D } from '../types';
import { pokemonById } from '@/data/pokemon';
import { GAME_CONFIG } from './constants';

// ============ Boss Definitions ============

export const BOSSES: Record<string, BossDefinition> = {
  articuno: {
    id: 'articuno',
    name: 'Articuno',
    pokemon: pokemonById.get(144)!,
    waveNumber: 10,
    maxHealth: 2000,
    introDialogue: "The frost of the north answers to no one. Prepare to be frozen!",
    defeatDialogue: "The ice... melts... You have earned my respect, trainer.",
    phases: [
      {
        healthThreshold: 1.0,
        attackPattern: 'spread',
        attackSpeed: 1.0,
        movePattern: 'sway',
        dialogue: "Feel the chill of my ice beam!",
      },
      {
        healthThreshold: 0.6,
        attackPattern: 'rain',
        attackSpeed: 1.3,
        movePattern: 'circle',
        dialogue: "A blizzard descends upon you!",
      },
      {
        healthThreshold: 0.3,
        attackPattern: 'storm',
        attackSpeed: 1.6,
        movePattern: 'chase',
        dialogue: "You cannot escape the absolute zero!",
      },
    ],
  },

  zapdos: {
    id: 'zapdos',
    name: 'Zapdos',
    pokemon: pokemonById.get(145)!,
    waveNumber: 20,
    maxHealth: 3000,
    introDialogue: "Thunder and lightning answer my call. You dare challenge the storm?",
    defeatDialogue: "The storm... subsides. Your strength is... electrifying.",
    phases: [
      {
        healthThreshold: 1.0,
        attackPattern: 'aimed',
        attackSpeed: 1.2,
        movePattern: 'sway',
        dialogue: "Feel my thunderbolt!",
      },
      {
        healthThreshold: 0.6,
        attackPattern: 'spiral',
        attackSpeed: 1.5,
        movePattern: 'teleport',
        dialogue: "Lightning strikes twice!",
      },
      {
        healthThreshold: 0.3,
        attackPattern: 'storm',
        attackSpeed: 1.8,
        movePattern: 'dive',
        dialogue: "WITNESS THE THUNDER GOD'S WRATH!",
      },
    ],
  },

  moltres: {
    id: 'moltres',
    name: 'Moltres',
    pokemon: pokemonById.get(146)!,
    waveNumber: 30,
    maxHealth: 4000,
    introDialogue: "From the flames I rise! Your weapons cannot extinguish my fire!",
    defeatDialogue: "Even the phoenix... falls. But remember, I shall rise again...",
    revives: true, // Special: Moltres revives once with 30% health
    phases: [
      {
        healthThreshold: 1.0,
        attackPattern: 'spread',
        attackSpeed: 1.3,
        movePattern: 'circle',
        dialogue: "Burn in my sacred flame!",
      },
      {
        healthThreshold: 0.5,
        attackPattern: 'beam',
        attackSpeed: 1.5,
        movePattern: 'sway',
        dialogue: "My flames grow stronger!",
      },
      {
        healthThreshold: 0.2,
        attackPattern: 'storm',
        attackSpeed: 2.0,
        movePattern: 'chase',
        dialogue: "I AM THE ETERNAL FLAME!",
      },
    ],
  },

  mewtwo: {
    id: 'mewtwo',
    name: 'Mewtwo',
    pokemon: pokemonById.get(150)!,
    waveNumber: 40,
    maxHealth: 5000,
    introDialogue: "I am the most powerful Pokemon in existence. Your struggle is... amusing.",
    defeatDialogue: "How... can a human defeat perfection? Perhaps... I have more to learn.",
    phases: [
      {
        healthThreshold: 1.0,
        attackPattern: 'aimed',
        attackSpeed: 1.5,
        movePattern: 'teleport',
        dialogue: "I've seen your attacks before you make them.",
      },
      {
        healthThreshold: 0.6,
        attackPattern: 'reflect',
        attackSpeed: 1.0,
        movePattern: 'hover',
        dialogue: "Your weapons are useless against my barrier!",
      },
      {
        healthThreshold: 0.4,
        attackPattern: 'summon',
        attackSpeed: 1.8,
        movePattern: 'teleport',
        dialogue: "Face the army of my mind!",
      },
      {
        healthThreshold: 0.2,
        attackPattern: 'storm',
        attackSpeed: 2.2,
        movePattern: 'chase',
        dialogue: "ENOUGH! I WILL END THIS!",
      },
    ],
  },

  rayquaza: {
    id: 'rayquaza',
    name: 'Rayquaza',
    pokemon: pokemonById.get(384)!, // Rayquaza is in later gen, using its actual ID
    waveNumber: 50,
    maxHealth: 7000,
    introDialogue: "I am the guardian of the skies! None may pass beyond this point!",
    defeatDialogue: "You have proven yourself worthy... The skies are yours to explore, champion.",
    phases: [
      {
        healthThreshold: 1.0,
        attackPattern: 'beam',
        attackSpeed: 1.5,
        movePattern: 'circle',
        dialogue: "Dragon breath! Witness my power!",
      },
      {
        healthThreshold: 0.7,
        attackPattern: 'spiral',
        attackSpeed: 1.8,
        movePattern: 'sway',
        dialogue: "The skies tremble before me!",
      },
      {
        healthThreshold: 0.5,
        attackPattern: 'summon',
        attackSpeed: 1.5,
        movePattern: 'teleport',
        dialogue: "Rise, servants of the sky!",
      },
      {
        healthThreshold: 0.3,
        attackPattern: 'storm',
        attackSpeed: 2.5,
        movePattern: 'dive',
        dialogue: "HYPER BEAM! MAXIMUM POWER!",
      },
    ],
  },
};

// ============ Boss Factory ============

export function createBoss(bossId: string): BossState | null {
  const definition = BOSSES[bossId];
  if (!definition) return null;

  const { VIEWPORT_WIDTH, BOSS_WIDTH, BOSS_HEIGHT } = GAME_CONFIG;

  return {
    id: `boss_${bossId}_${Date.now()}`,
    x: VIEWPORT_WIDTH / 2 - BOSS_WIDTH / 2,
    y: -BOSS_HEIGHT, // Start off screen
    width: BOSS_WIDTH,
    height: BOSS_HEIGHT,
    velocity: { x: 0, y: 50 }, // Initial entry velocity
    isActive: true,
    definition,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    currentPhase: 0,
    phaseTimer: 0,
    attackTimer: 0,
    moveTimer: 0,
    isEnraged: false,
    hasRevived: false,
    shieldActive: false,
    shieldHealth: 0,
  };
}

// ============ Boss AI ============

export function getBossPhase(boss: BossState): BossPhase {
  const healthPercent = boss.health / boss.maxHealth;
  const phases = boss.definition.phases;

  for (let i = phases.length - 1; i >= 0; i--) {
    if (healthPercent <= phases[i].healthThreshold) {
      return phases[i];
    }
  }

  return phases[0];
}

export function getBossPhaseIndex(boss: BossState): number {
  const healthPercent = boss.health / boss.maxHealth;
  const phases = boss.definition.phases;

  for (let i = phases.length - 1; i >= 0; i--) {
    if (healthPercent <= phases[i].healthThreshold) {
      return i;
    }
  }

  return 0;
}

// ============ Attack Pattern Generators ============

export interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

export function generateBossAttack(
  boss: BossState,
  playerPos: Vector2D,
  time: number
): BossProjectile[] {
  const phase = getBossPhase(boss);
  const centerX = boss.x + boss.width / 2;
  const centerY = boss.y + boss.height / 2;
  const projectiles: BossProjectile[] = [];

  const baseSpeed = 200 * phase.attackSpeed;
  const damage = 15 + boss.definition.waveNumber;

  switch (phase.attackPattern) {
    case 'spread': {
      // Fire bullets in spread pattern
      const count = 5 + Math.floor(boss.definition.waveNumber / 10);
      const spreadAngle = Math.PI / 3;
      const startAngle = Math.PI / 2 - spreadAngle / 2;

      for (let i = 0; i < count; i++) {
        const angle = startAngle + (spreadAngle * i) / (count - 1);
        projectiles.push({
          x: centerX,
          y: centerY + boss.height / 2,
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          damage,
        });
      }
      break;
    }

    case 'beam': {
      // Continuous stream of bullets
      const count = 3;
      for (let i = 0; i < count; i++) {
        projectiles.push({
          x: centerX - 10 + i * 10,
          y: centerY + boss.height / 2,
          vx: (Math.random() - 0.5) * 30,
          vy: baseSpeed,
          damage: damage * 0.5,
        });
      }
      break;
    }

    case 'spiral': {
      // Spiral pattern
      const count = 4;
      const baseAngle = (time * 3) % (Math.PI * 2);
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.PI * 2 * i) / count;
        projectiles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          damage,
        });
      }
      break;
    }

    case 'aimed': {
      // Aimed at player
      const dx = playerPos.x - centerX;
      const dy = playerPos.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;

      projectiles.push({
        x: centerX,
        y: centerY + boss.height / 2,
        vx: nx * baseSpeed,
        vy: ny * baseSpeed,
        damage,
      });

      // Add slight spread
      const spreadAmount = 0.2;
      projectiles.push({
        x: centerX,
        y: centerY + boss.height / 2,
        vx: (nx + spreadAmount) * baseSpeed,
        vy: ny * baseSpeed,
        damage,
      });
      projectiles.push({
        x: centerX,
        y: centerY + boss.height / 2,
        vx: (nx - spreadAmount) * baseSpeed,
        vy: ny * baseSpeed,
        damage,
      });
      break;
    }

    case 'rain': {
      // Bullets rain from top
      const count = 8;
      for (let i = 0; i < count; i++) {
        const x = boss.x + Math.random() * boss.width;
        projectiles.push({
          x,
          y: boss.y + boss.height,
          vx: (Math.random() - 0.5) * 50,
          vy: baseSpeed * 0.8,
          damage,
        });
      }
      break;
    }

    case 'storm': {
      // Combination attack - all patterns at reduced rate
      // Spread
      for (let i = 0; i < 3; i++) {
        const angle = Math.PI / 2 - 0.4 + (0.8 * i) / 2;
        projectiles.push({
          x: centerX,
          y: centerY + boss.height / 2,
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          damage,
        });
      }
      // Spiral
      const spiralAngle = (time * 2) % (Math.PI * 2);
      projectiles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(spiralAngle) * baseSpeed * 0.8,
        vy: Math.sin(spiralAngle) * baseSpeed * 0.8,
        damage,
      });
      projectiles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(spiralAngle + Math.PI) * baseSpeed * 0.8,
        vy: Math.sin(spiralAngle + Math.PI) * baseSpeed * 0.8,
        damage,
      });
      break;
    }

    case 'reflect': {
      // Creates shield, minimal attacks
      if (!boss.shieldActive) {
        // Shield will be handled in game logic
      }
      // Occasional aimed shot
      if (Math.random() < 0.3) {
        const dx = playerPos.x - centerX;
        const dy = playerPos.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        projectiles.push({
          x: centerX,
          y: centerY + boss.height / 2,
          vx: (dx / dist) * baseSpeed * 0.6,
          vy: (dy / dist) * baseSpeed * 0.6,
          damage,
        });
      }
      break;
    }

    case 'summon': {
      // Summon handled in game logic, minimal attack
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      projectiles.push({
        x: centerX,
        y: centerY + boss.height / 2,
        vx: Math.cos(angle) * baseSpeed * 0.5,
        vy: Math.sin(angle) * baseSpeed * 0.5,
        damage,
      });
      break;
    }
  }

  return projectiles;
}

// ============ Movement Pattern Updates ============

export function updateBossMovement(
  boss: BossState,
  playerPos: Vector2D,
  time: number,
  delta: number
): Vector2D {
  const phase = getBossPhase(boss);
  const { VIEWPORT_WIDTH, BOSS_WIDTH } = GAME_CONFIG;

  const centerX = boss.x + boss.width / 2;
  const maxX = VIEWPORT_WIDTH - BOSS_WIDTH;
  const moveSpeed = 150 * (1 + boss.definition.waveNumber / 50);

  let vx = 0;
  let vy = 0;

  // Initial entry
  if (boss.y < 80) {
    return { x: 0, y: 100 };
  }

  switch (phase.movePattern) {
    case 'hover':
      // Stay in place with slight drift
      vx = Math.sin(time * 0.5) * 20;
      vy = Math.cos(time * 0.7) * 10;
      break;

    case 'sway':
      // Side to side movement
      vx = Math.sin(time * 1.5) * moveSpeed;
      vy = Math.cos(time) * 20;
      break;

    case 'chase':
      // Follow player
      const dx = playerPos.x - centerX;
      vx = Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed * 0.8);
      vy = Math.sin(time * 2) * 30;
      break;

    case 'teleport':
      // Handled separately - stay in place between teleports
      vx = Math.sin(time * 2) * 30;
      vy = Math.cos(time * 1.5) * 20;
      break;

    case 'circle':
      // Circle around center
      const radius = 150;
      const targetX = VIEWPORT_WIDTH / 2 + Math.cos(time) * radius;
      const targetY = 120 + Math.sin(time) * 40;
      vx = (targetX - centerX) * 2;
      vy = (targetY - (boss.y + boss.height / 2)) * 2;
      break;

    case 'dive':
      // Occasional dive attacks
      if (Math.sin(time * 0.5) > 0.8) {
        vy = moveSpeed;
      } else {
        vx = Math.sin(time * 2) * moveSpeed * 0.5;
        // Return to top
        if (boss.y > 150) {
          vy = -moveSpeed * 0.5;
        }
      }
      break;
  }

  // Clamp to bounds
  if (boss.x <= 0 && vx < 0) vx = Math.abs(vx);
  if (boss.x >= maxX && vx > 0) vx = -Math.abs(vx);

  return { x: vx, y: vy };
}

// Get boss by ID
export function getBoss(bossId: string): BossDefinition | null {
  return BOSSES[bossId] || null;
}

// Get all boss IDs
export function getAllBossIds(): string[] {
  return Object.keys(BOSSES);
}
