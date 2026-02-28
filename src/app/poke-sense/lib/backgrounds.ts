/**
 * PokéSense Background System
 * Dynamic type-based environments with particles and atmosphere
 */

import { BackgroundTheme, ParticleConfig } from './gameTypes';

// Re-export types for components that import from this file
export type { BackgroundTheme } from './gameTypes';

// Helper to create particle config
const particle = (emoji: string, count: number = 8, opts: Partial<ParticleConfig> = {}): ParticleConfig => ({
  emoji,
  count,
  speed: opts.speed ?? 1,
  size: opts.size ?? 32,
  opacity: opts.opacity ?? 0.6,
  rotationSpeed: opts.rotationSpeed ?? 0.5,
});

// Complete background themes for all 18 types
export const typeBackgrounds: Record<string, BackgroundTheme> = {
  Fire: {
    gradient: 'from-orange-600 via-red-500 to-yellow-500',
    particles: [
      particle('🔥', 12, { speed: 1.5, size: 36 }),
      particle('✨', 8, { speed: 0.8, size: 24 }),
      particle('💫', 4, { speed: 1.2 }),
      particle('🌋', 2, { speed: 0.3, size: 48 }),
    ],
    ambientColor: 'rgba(255, 100, 0, 0.25)',
    glowColor: '#FF6B00',
    atmosphere: 'Volcanic flames dance around you, ${playerName}! The heat is intense!',
    musicMood: 'exciting',
  },

  Water: {
    gradient: 'from-blue-600 via-cyan-500 to-blue-400',
    particles: [
      particle('💧', 15, { speed: 0.8, size: 28 }),
      particle('🫧', 12, { speed: 1.2, size: 24 }),
      particle('💦', 6, { speed: 1.5 }),
      particle('🌊', 3, { speed: 0.5, size: 44 }),
    ],
    ambientColor: 'rgba(0, 150, 255, 0.25)',
    glowColor: '#00A0FF',
    atmosphere: 'Cool ocean waves surround you, ${playerName}! I can smell the sea salt!',
    musicMood: 'calm',
  },

  Grass: {
    gradient: 'from-green-600 via-emerald-500 to-lime-400',
    particles: [
      particle('🍃', 15, { speed: 1.0, size: 28 }),
      particle('🌿', 8, { speed: 0.6, size: 32 }),
      particle('🌱', 6, { speed: 0.4 }),
      particle('✨', 8, { speed: 0.8, size: 20 }),
      particle('🌸', 4, { speed: 1.2, size: 24 }),
    ],
    ambientColor: 'rgba(0, 200, 100, 0.25)',
    glowColor: '#00CC66',
    atmosphere: 'A peaceful forest clearing welcomes you, ${playerName}! Nature is alive!',
    musicMood: 'calm',
  },

  Electric: {
    gradient: 'from-yellow-400 via-amber-300 to-yellow-500',
    particles: [
      particle('⚡', 12, { speed: 2.5, size: 36 }),
      particle('✨', 15, { speed: 1.5, size: 24 }),
      particle('💫', 8, { speed: 2.0 }),
      particle('⭐', 6, { speed: 1.8 }),
    ],
    ambientColor: 'rgba(255, 220, 0, 0.35)',
    glowColor: '#FFD700',
    atmosphere: 'Electric energy crackles in the air, ${playerName}! My hair is standing up!',
    musicMood: 'exciting',
  },

  Ghost: {
    gradient: 'from-purple-900 via-indigo-800 to-purple-700',
    particles: [
      particle('👻', 8, { speed: 0.6, size: 40, opacity: 0.7 }),
      particle('💀', 4, { speed: 0.4, size: 28 }),
      particle('🌙', 3, { speed: 0.2, size: 36 }),
      particle('✨', 10, { speed: 0.5, size: 20, opacity: 0.5 }),
      particle('🦇', 5, { speed: 1.2, size: 28 }),
    ],
    ambientColor: 'rgba(100, 0, 150, 0.4)',
    glowColor: '#8B00FF',
    atmosphere: 'Mysterious shadows swirl around, ${playerName}! Don\'t be scared, I\'m here with you!',
    musicMood: 'mysterious',
  },

  Psychic: {
    gradient: 'from-pink-500 via-purple-500 to-indigo-600',
    particles: [
      particle('🔮', 6, { speed: 0.7, size: 40 }),
      particle('✨', 15, { speed: 1.0, size: 24 }),
      particle('💫', 10, { speed: 0.8 }),
      particle('🌟', 8, { speed: 0.6 }),
      particle('🧠', 3, { speed: 0.3, size: 28 }),
    ],
    ambientColor: 'rgba(200, 100, 255, 0.3)',
    glowColor: '#FF00FF',
    atmosphere: 'Cosmic energy flows through space, ${playerName}! I can feel thoughts in the air!',
    musicMood: 'mysterious',
  },

  Ice: {
    gradient: 'from-cyan-300 via-blue-200 to-white',
    particles: [
      particle('❄️', 20, { speed: 0.6, size: 28 }),
      particle('🌨️', 8, { speed: 0.8, size: 24 }),
      particle('💎', 5, { speed: 0.3, size: 32 }),
      particle('✨', 12, { speed: 0.4, size: 20 }),
    ],
    ambientColor: 'rgba(200, 240, 255, 0.35)',
    glowColor: '#00FFFF',
    atmosphere: 'Snowflakes drift gently down, ${playerName}! It\'s a winter wonderland!',
    musicMood: 'calm',
  },

  Dragon: {
    gradient: 'from-indigo-700 via-purple-600 to-blue-800',
    particles: [
      particle('🐉', 4, { speed: 0.4, size: 52, opacity: 0.8 }),
      particle('✨', 15, { speed: 1.0, size: 24 }),
      particle('💫', 10, { speed: 0.8 }),
      particle('⭐', 8, { speed: 0.6, size: 28 }),
      particle('🔥', 5, { speed: 1.2, size: 28 }),
    ],
    ambientColor: 'rgba(100, 50, 200, 0.3)',
    glowColor: '#6600FF',
    atmosphere: 'Ancient dragon power fills the air, ${playerName}! This is legendary!',
    musicMood: 'epic',
  },

  Dark: {
    gradient: 'from-gray-900 via-slate-800 to-gray-700',
    particles: [
      particle('🌑', 6, { speed: 0.3, size: 36 }),
      particle('✨', 10, { speed: 0.5, size: 20, opacity: 0.4 }),
      particle('⭐', 8, { speed: 0.4, size: 24, opacity: 0.5 }),
      particle('🌙', 4, { speed: 0.2, size: 32 }),
      particle('🦉', 3, { speed: 0.6, size: 28 }),
    ],
    ambientColor: 'rgba(30, 30, 50, 0.5)',
    glowColor: '#333366',
    atmosphere: 'Darkness embraces everything, ${playerName}! But your courage lights the way!',
    musicMood: 'mysterious',
  },

  Fairy: {
    gradient: 'from-pink-400 via-rose-300 to-pink-200',
    particles: [
      particle('🧚', 6, { speed: 0.8, size: 36 }),
      particle('✨', 20, { speed: 1.0, size: 24 }),
      particle('💖', 10, { speed: 0.6 }),
      particle('🌸', 12, { speed: 0.7, size: 28 }),
      particle('🦋', 6, { speed: 1.2, size: 28 }),
    ],
    ambientColor: 'rgba(255, 150, 200, 0.3)',
    glowColor: '#FF69B4',
    atmosphere: 'Magical sparkles fill the air, ${playerName}! It\'s like a fairy tale!',
    musicMood: 'calm',
  },

  Fighting: {
    gradient: 'from-red-700 via-orange-600 to-red-500',
    particles: [
      particle('💪', 8, { speed: 1.2, size: 36 }),
      particle('✨', 10, { speed: 1.5, size: 24 }),
      particle('🔥', 8, { speed: 1.3 }),
      particle('⭐', 6, { speed: 1.0 }),
      particle('👊', 4, { speed: 1.5, size: 32 }),
    ],
    ambientColor: 'rgba(200, 50, 50, 0.3)',
    glowColor: '#CC0000',
    atmosphere: 'The spirit of battle awakens, ${playerName}! I can feel the fighting energy!',
    musicMood: 'exciting',
  },

  Rock: {
    gradient: 'from-amber-700 via-stone-600 to-amber-500',
    particles: [
      particle('🪨', 8, { speed: 0.3, size: 40 }),
      particle('✨', 8, { speed: 0.5, size: 20 }),
      particle('💎', 4, { speed: 0.2, size: 32 }),
      particle('⭐', 6, { speed: 0.4 }),
    ],
    ambientColor: 'rgba(150, 100, 50, 0.3)',
    glowColor: '#996633',
    atmosphere: 'Ancient mountains stand tall around you, ${playerName}! These rocks have stories!',
    musicMood: 'calm',
  },

  Ground: {
    gradient: 'from-amber-600 via-yellow-700 to-orange-600',
    particles: [
      particle('🏜️', 4, { speed: 0.4, size: 44 }),
      particle('✨', 8, { speed: 0.6, size: 20 }),
      particle('🌾', 10, { speed: 0.5, size: 28 }),
      particle('⭐', 6, { speed: 0.4 }),
    ],
    ambientColor: 'rgba(200, 150, 50, 0.3)',
    glowColor: '#CC9933',
    atmosphere: 'Desert sands shift beneath your feet, ${playerName}! The earth is powerful here!',
    musicMood: 'calm',
  },

  Steel: {
    gradient: 'from-slate-500 via-gray-400 to-zinc-500',
    particles: [
      particle('⚙️', 8, { speed: 0.6, size: 36 }),
      particle('✨', 12, { speed: 0.8, size: 24 }),
      particle('💫', 6, { speed: 0.5 }),
      particle('🔩', 5, { speed: 0.4, size: 24 }),
    ],
    ambientColor: 'rgba(150, 150, 170, 0.3)',
    glowColor: '#9999AA',
    atmosphere: 'Metal gleams in the light, ${playerName}! Everything here is strong as steel!',
    musicMood: 'calm',
  },

  Poison: {
    gradient: 'from-purple-700 via-fuchsia-600 to-purple-500',
    particles: [
      particle('☠️', 4, { speed: 0.5, size: 36 }),
      particle('✨', 8, { speed: 0.7, size: 20, opacity: 0.5 }),
      particle('💀', 4, { speed: 0.4, size: 28 }),
      particle('🧪', 5, { speed: 0.6, size: 28 }),
      particle('💜', 8, { speed: 0.8, size: 24 }),
    ],
    ambientColor: 'rgba(150, 50, 200, 0.3)',
    glowColor: '#9900CC',
    atmosphere: 'Toxic mist swirls around, ${playerName}! Be careful, but don\'t worry, we\'re safe!',
    musicMood: 'mysterious',
  },

  Bug: {
    gradient: 'from-lime-600 via-green-500 to-emerald-400',
    particles: [
      particle('🐛', 8, { speed: 0.8, size: 28 }),
      particle('🦋', 10, { speed: 1.0, size: 32 }),
      particle('🍃', 12, { speed: 0.6, size: 24 }),
      particle('✨', 10, { speed: 0.7, size: 20 }),
      particle('🐝', 6, { speed: 1.2, size: 26 }),
    ],
    ambientColor: 'rgba(100, 200, 50, 0.3)',
    glowColor: '#66CC00',
    atmosphere: 'A garden buzzes with life, ${playerName}! So many little creatures!',
    musicMood: 'calm',
  },

  Flying: {
    gradient: 'from-sky-400 via-blue-300 to-indigo-300',
    particles: [
      particle('🪶', 12, { speed: 1.2, size: 28 }),
      particle('☁️', 8, { speed: 0.4, size: 48, opacity: 0.7 }),
      particle('✨', 10, { speed: 0.8, size: 24 }),
      particle('🌤️', 4, { speed: 0.3, size: 40 }),
      particle('🕊️', 5, { speed: 1.0, size: 32 }),
    ],
    ambientColor: 'rgba(150, 200, 255, 0.3)',
    glowColor: '#66CCFF',
    atmosphere: 'High above the clouds, ${playerName}! The sky is endless up here!',
    musicMood: 'calm',
  },

  Normal: {
    gradient: 'from-amber-200 via-orange-100 to-yellow-100',
    particles: [
      particle('⭐', 12, { speed: 0.6, size: 28 }),
      particle('✨', 15, { speed: 0.8, size: 24 }),
      particle('🌼', 8, { speed: 0.4, size: 28 }),
      particle('🌸', 6, { speed: 0.5, size: 24 }),
    ],
    ambientColor: 'rgba(255, 220, 180, 0.3)',
    glowColor: '#FFCC99',
    atmosphere: 'A peaceful meadow awaits, ${playerName}! What a lovely place!',
    musicMood: 'calm',
  },
};

// Get background for a Pokemon's primary type
export function getBackgroundForType(type: string): BackgroundTheme {
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return typeBackgrounds[normalizedType] || typeBackgrounds.Normal;
}

// Get personalized atmosphere text
export function getAtmosphereText(type: string, playerName: string): string {
  const bg = getBackgroundForType(type);
  return bg.atmosphere.replace('${playerName}', playerName);
}

// Generate initial particle positions
export interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  speed: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  delay: number;
}

export function generateParticles(theme: BackgroundTheme): Particle[] {
  const particles: Particle[] = [];
  let id = 0;

  theme.particles.forEach(config => {
    for (let i = 0; i < config.count; i++) {
      particles.push({
        id: id++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        emoji: config.emoji,
        size: config.size + (Math.random() - 0.5) * 10,
        speed: config.speed + (Math.random() - 0.5) * 0.5,
        opacity: config.opacity + (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * 360,
        rotationSpeed: config.rotationSpeed * (Math.random() > 0.5 ? 1 : -1),
        delay: Math.random() * 5,
      });
    }
  });

  return particles;
}
