// Pokemon Starblast - Particle System

import { Particle, ParticleType, Vector2D } from '../types';
import { COLORS, GAME_CONFIG } from './constants';
import { typeColors } from '@/data/pokemon';

// ============ Particle ID Generator ============

let particleIdCounter = 0;

function generateParticleId(): string {
  return `particle_${particleIdCounter++}_${Date.now()}`;
}

// ============ Basic Particle Creation ============

export function createParticle(
  x: number,
  y: number,
  type: ParticleType,
  overrides: Partial<Particle> = {}
): Particle {
  const defaults: Particle = {
    id: generateParticleId(),
    x,
    y,
    vx: (Math.random() - 0.5) * 100,
    vy: (Math.random() - 0.5) * 100,
    life: 1,
    maxLife: 1,
    size: 4,
    color: COLORS.particles[type] || '#ffffff',
    type,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 360,
    scale: 1,
    scaleDecay: 0,
    gravity: 0,
    alpha: 1,
  };

  return { ...defaults, ...overrides };
}

// ============ Particle Effect Generators ============

export function createExplosion(
  x: number,
  y: number,
  color: string,
  count: number = 12,
  intensity: number = 1
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = (80 + Math.random() * 120) * intensity;

    particles.push(
      createParticle(x, y, 'explosion', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 4 + Math.random() * 6,
        color,
        gravity: 100,
        scaleDecay: 0.5,
      })
    );
  }

  return particles;
}

export function createSparks(
  x: number,
  y: number,
  color: string,
  count: number = 8
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;

    particles.push(
      createParticle(x, y, 'spark', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color,
        gravity: 200,
      })
    );
  }

  return particles;
}

export function createThrusterFlame(
  x: number,
  y: number,
  velocity: Vector2D
): Particle[] {
  const particles: Particle[] = [];
  const count = 2;

  for (let i = 0; i < count; i++) {
    particles.push(
      createParticle(x, y, 'thruster', {
        vx: -velocity.x * 0.3 + (Math.random() - 0.5) * 30,
        vy: 50 + Math.random() * 30, // Always goes down (behind ship)
        life: 0.15 + Math.random() * 0.1,
        maxLife: 0.25,
        size: 6 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#00aaff' : '#0088cc',
        scaleDecay: 2,
      })
    );
  }

  return particles;
}

export function createTypeExplosion(
  x: number,
  y: number,
  pokemonType: string,
  count: number = 15
): Particle[] {
  const color = typeColors[pokemonType] || typeColors['normal'];
  const particles = createExplosion(x, y, color, count, 1.2);

  // Add type-specific effects
  switch (pokemonType) {
    case 'fire':
      particles.push(...createFlameTrail(x, y, 5));
      break;
    case 'water':
      particles.push(...createWaterSplash(x, y, 5));
      break;
    case 'electric':
      particles.push(...createElectricSparks(x, y, 8));
      break;
    case 'ice':
      particles.push(...createIceShards(x, y, 6));
      break;
  }

  return particles;
}

export function createFlameTrail(
  x: number,
  y: number,
  count: number = 3
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push(
      createParticle(x + (Math.random() - 0.5) * 20, y, 'flame', {
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 50,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 8 + Math.random() * 8,
        color: Math.random() > 0.3 ? '#ff4500' : '#ffd93d',
        scaleDecay: 1,
        gravity: -50, // Flames rise
      })
    );
  }

  return particles;
}

export function createWaterSplash(
  x: number,
  y: number,
  count: number = 5
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 60 + Math.random() * 80;

    particles.push(
      createParticle(x, y, 'water', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 4 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#1e90ff' : '#6890F0',
        gravity: 300,
      })
    );
  }

  return particles;
}

export function createElectricSparks(
  x: number,
  y: number,
  count: number = 6
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 150;

    particles.push(
      createParticle(x, y, 'electric', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.1 + Math.random() * 0.15,
        maxLife: 0.25,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#ffff00' : '#ffd93d',
      })
    );
  }

  return particles;
}

export function createIceShards(
  x: number,
  y: number,
  count: number = 5
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;

    particles.push(
      createParticle(x, y, 'ice', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 5 + Math.random() * 5,
        color: Math.random() > 0.5 ? '#87ceeb' : '#b0e0e6',
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 500,
        gravity: 100,
      })
    );
  }

  return particles;
}

export function createComboEffect(
  x: number,
  y: number,
  comboLevel: number
): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(20, 5 + comboLevel);
  const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 100 + comboLevel * 10;

    particles.push(
      createParticle(x, y, 'combo', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 6 + Math.random() * 4,
        color: colors[i % colors.length],
        scaleDecay: 0.5,
      })
    );
  }

  return particles;
}

export function createGrazeEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < 3; i++) {
    particles.push(
      createParticle(x, y, 'graze', {
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 0.2 + Math.random() * 0.1,
        maxLife: 0.3,
        size: 4 + Math.random() * 2,
        color: '#00ff00',
        alpha: 0.8,
      })
    );
  }

  return particles;
}

export function createHealEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;

    particles.push(
      createParticle(
        x + Math.cos(angle) * 30,
        y + Math.sin(angle) * 30,
        'heal',
        {
          vx: -Math.cos(angle) * 20,
          vy: -Math.sin(angle) * 20 - 50,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          size: 4 + Math.random() * 4,
          color: '#00ff88',
        }
      )
    );
  }

  return particles;
}

export function createDamageEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 80;

    particles.push(
      createParticle(x, y, 'damage', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 3 + Math.random() * 3,
        color: '#ff0000',
      })
    );
  }

  return particles;
}

export function createStarField(count: number = 100): Particle[] {
  const particles: Particle[] = [];
  const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } = GAME_CONFIG;

  for (let i = 0; i < count; i++) {
    const size = 1 + Math.random() * 2;
    const speed = 20 + Math.random() * 60;

    particles.push(
      createParticle(
        Math.random() * VIEWPORT_WIDTH,
        Math.random() * VIEWPORT_HEIGHT,
        'star',
        {
          vx: 0,
          vy: speed,
          life: 100, // Long-lived
          maxLife: 100,
          size,
          color: '#ffffff',
          alpha: 0.3 + Math.random() * 0.7,
        }
      )
    );
  }

  return particles;
}

// ============ Particle Update ============

export function updateParticle(particle: Particle, delta: number): Particle {
  return {
    ...particle,
    x: particle.x + particle.vx * delta,
    y: particle.y + particle.vy * delta,
    vy: particle.vy + (particle.gravity || 0) * delta,
    life: particle.life - delta,
    scale: particle.scale
      ? Math.max(0, particle.scale - (particle.scaleDecay || 0) * delta)
      : 1,
    rotation: particle.rotation
      ? particle.rotation + (particle.rotationSpeed || 0) * delta
      : 0,
    alpha: particle.alpha
      ? particle.alpha * (particle.life / particle.maxLife)
      : particle.life / particle.maxLife,
  };
}

export function updateParticles(particles: Particle[], delta: number): Particle[] {
  const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, MAX_PARTICLES } = GAME_CONFIG;

  return particles
    .map(p => updateParticle(p, delta))
    .filter(p => {
      // Remove dead particles
      if (p.life <= 0) return false;

      // Remove off-screen particles (except stars which wrap)
      if (p.type !== 'star') {
        if (p.x < -50 || p.x > VIEWPORT_WIDTH + 50) return false;
        if (p.y < -50 || p.y > VIEWPORT_HEIGHT + 50) return false;
      } else {
        // Wrap stars
        if (p.y > VIEWPORT_HEIGHT) {
          p.y = -10;
          p.x = Math.random() * VIEWPORT_WIDTH;
        }
      }

      return true;
    })
    .slice(-MAX_PARTICLES); // Limit total particles
}

// ============ Boss Aura ============

export function createBossAura(
  x: number,
  y: number,
  color: string,
  time: number
): Particle[] {
  const particles: Particle[] = [];
  const count = 3;

  for (let i = 0; i < count; i++) {
    const angle = time * 2 + (Math.PI * 2 * i) / count;
    const radius = 60 + Math.sin(time * 3) * 10;

    particles.push(
      createParticle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 'star', {
        vx: 0,
        vy: 0,
        life: 0.1,
        maxLife: 0.1,
        size: 8 + Math.random() * 4,
        color,
        alpha: 0.5,
      })
    );
  }

  return particles;
}
