// Pokemon Starblast - Layered Sound System

import {
  playSound,
  stopSound,
  setGlobalVolume,
  SoundEffect,
  PlaySoundOptions,
} from '@/lib/sounds';
import { AUDIO_CONFIG } from '../utils/constants';

// ============ Sound Layer Management ============

interface ActiveSound {
  id: string;
  audio: HTMLAudioElement | null;
  type: SoundCategory;
  startTime: number;
}

type SoundCategory = 'background' | 'player' | 'enemy' | 'combo' | 'ui' | 'boss';

const activeSounds: Map<string, ActiveSound> = new Map();
let soundIdCounter = 0;

// ============ Initialize Audio ============

export function initializeAudio(): void {
  setGlobalVolume(AUDIO_CONFIG.masterVolume);
}

// ============ Play Categorized Sounds ============

function playCategorizedSound(
  sound: SoundEffect,
  category: SoundCategory,
  options?: PlaySoundOptions
): string {
  const id = `${category}_${soundIdCounter++}`;
  const audio = playSound(sound, options);

  if (audio) {
    const activeSound: ActiveSound = {
      id,
      audio,
      type: category,
      startTime: Date.now(),
    };

    activeSounds.set(id, activeSound);

    // Clean up when sound ends
    audio.onended = () => {
      activeSounds.delete(id);
    };
  }

  return id;
}

// ============ Stop Sounds by Category ============

export function stopSoundsByCategory(category: SoundCategory): void {
  activeSounds.forEach((sound, id) => {
    if (sound.type === category && sound.audio) {
      stopSound(sound.audio);
      activeSounds.delete(id);
    }
  });
}

export function stopAllSounds(): void {
  activeSounds.forEach((sound) => {
    if (sound.audio) {
      stopSound(sound.audio);
    }
  });
  activeSounds.clear();
}

// ============ Player Sounds ============

export function playShoot(): void {
  const config = AUDIO_CONFIG.sounds.shoot;
  playCategorizedSound(config.sound, 'player', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playPlayerHit(): void {
  const config = AUDIO_CONFIG.sounds.playerHit;
  playCategorizedSound(config.sound, 'player', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playSpecialAbility(): void {
  const config = AUDIO_CONFIG.sounds.special;
  playCategorizedSound(config.sound, 'player', {
    volume: config.volume,
    rate: config.rate,
  });
}

// ============ Enemy Sounds ============

export function playEnemyHit(size: number = 1): void {
  const config = AUDIO_CONFIG.sounds.enemyHit;
  // Vary pitch based on enemy size
  const rate = config.rate + (1 - size) * 0.3;
  playCategorizedSound(config.sound, 'enemy', {
    volume: config.volume,
    rate,
  });
}

export function playEnemyDeath(pokemonType?: string): void {
  const config = AUDIO_CONFIG.sounds.enemyDeath;
  // Could vary based on type in future
  playCategorizedSound(config.sound, 'enemy', {
    volume: config.volume,
    rate: config.rate,
  });
}

// ============ Power-up Sounds ============

export function playPowerUp(): void {
  const config = AUDIO_CONFIG.sounds.powerUp;
  playCategorizedSound(config.sound, 'ui', {
    volume: config.volume,
    rate: config.rate,
  });
}

// ============ Boss Sounds ============

export function playBossSpawn(): void {
  const config = AUDIO_CONFIG.sounds.bossSpawn;
  // Layer multiple sounds for epic effect
  playCategorizedSound('whoosh', 'boss', { volume: 0.5, rate: 0.6 });
  setTimeout(() => {
    playCategorizedSound(config.sound, 'boss', {
      volume: config.volume,
      rate: config.rate,
    });
  }, 200);
}

export function playBossHit(): void {
  const config = AUDIO_CONFIG.sounds.bossHit;
  playCategorizedSound(config.sound, 'boss', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playBossDefeat(): void {
  const config = AUDIO_CONFIG.sounds.bossDefeat;
  // Epic layered defeat sound
  playCategorizedSound('whoosh', 'boss', { volume: 0.6, rate: 0.5 });
  setTimeout(() => {
    playCategorizedSound('powerup', 'boss', { volume: 0.8, rate: 1.0 });
  }, 300);
  setTimeout(() => {
    playCategorizedSound(config.sound, 'boss', {
      volume: config.volume,
      rate: config.rate,
    });
  }, 500);
}

export function playBossPhaseChange(): void {
  playCategorizedSound('powerup', 'boss', { volume: 0.7, rate: 0.8 });
  setTimeout(() => {
    playCategorizedSound('whoosh', 'boss', { volume: 0.5, rate: 1.2 });
  }, 150);
}

// ============ Combo Sounds ============

export function playComboSound(comboCount: number): void {
  if (comboCount >= 50) {
    const config = AUDIO_CONFIG.sounds.combo50;
    playCategorizedSound(config.sound, 'combo', {
      volume: config.volume,
      rate: config.rate,
    });
  } else if (comboCount >= 25) {
    const config = AUDIO_CONFIG.sounds.combo25;
    playCategorizedSound(config.sound, 'combo', {
      volume: config.volume,
      rate: config.rate,
    });
  } else if (comboCount >= 10) {
    const config = AUDIO_CONFIG.sounds.combo10;
    playCategorizedSound(config.sound, 'combo', {
      volume: config.volume,
      rate: config.rate,
    });
  } else if (comboCount >= 5) {
    const config = AUDIO_CONFIG.sounds.combo5;
    playCategorizedSound(config.sound, 'combo', {
      volume: config.volume,
      rate: config.rate,
    });
  }
}

// ============ UI Sounds ============

export function playWaveComplete(): void {
  const config = AUDIO_CONFIG.sounds.waveComplete;
  playCategorizedSound(config.sound, 'ui', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playGameOver(): void {
  const config = AUDIO_CONFIG.sounds.gameOver;
  playCategorizedSound(config.sound, 'ui', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playGraze(): void {
  const config = AUDIO_CONFIG.sounds.graze;
  playCategorizedSound(config.sound, 'player', {
    volume: config.volume,
    rate: config.rate,
  });
}

export function playMenuClick(): void {
  playCategorizedSound('click', 'ui', { volume: 0.6, rate: 1.0 });
}

export function playMenuHover(): void {
  playCategorizedSound('hover', 'ui', { volume: 0.3, rate: 1.2 });
}

export function playMenuSelect(): void {
  playCategorizedSound('select', 'ui', { volume: 0.7, rate: 1.0 });
}

// ============ Progressive Sounds ============

/**
 * Play a sound that progressively gets more intense
 */
export function playProgressiveSound(
  sound: SoundEffect,
  progress: number, // 0 to 1
  category: SoundCategory = 'ui'
): void {
  playCategorizedSound(sound, category, {
    volume: 0.5 + progress * 0.5,
    rate: 1.0 + progress * 0.5,
  });
}

/**
 * Play streak-based sound with escalating intensity
 */
export function playStreakSound(streakCount: number): void {
  const intensity = Math.min(1, streakCount / 20);
  playCategorizedSound('pop', 'combo', {
    volume: 0.4 + intensity * 0.4,
    rate: 1.0 + intensity * 0.5,
  });
}

// ============ Layered Effect Sequences ============

/**
 * Play a complex layered effect
 */
export function playLayeredEffect(
  sounds: Array<{ sound: SoundEffect; delay: number; options?: PlaySoundOptions }>
): void {
  sounds.forEach(({ sound, delay, options }) => {
    setTimeout(() => {
      playCategorizedSound(sound, 'ui', options);
    }, delay);
  });
}

/**
 * Epic explosion effect (multiple layered sounds)
 */
export function playEpicExplosion(): void {
  playLayeredEffect([
    { sound: 'pop', delay: 0, options: { volume: 0.6, rate: 0.8 } },
    { sound: 'whoosh', delay: 50, options: { volume: 0.5, rate: 1.2 } },
    { sound: 'pop', delay: 100, options: { volume: 0.4, rate: 1.0 } },
    { sound: 'bounce', delay: 150, options: { volume: 0.3, rate: 0.7 } },
  ]);
}

/**
 * Victory fanfare
 */
export function playVictoryFanfare(): void {
  playLayeredEffect([
    { sound: 'win', delay: 0, options: { volume: 1.0, rate: 1.0 } },
    { sound: 'powerup', delay: 500, options: { volume: 0.7, rate: 1.1 } },
    { sound: 'streak', delay: 800, options: { volume: 0.5, rate: 1.2 } },
  ]);
}

// ============ Volume Ducking ============

let originalVolume = AUDIO_CONFIG.masterVolume;

/**
 * Temporarily reduce volume (e.g., for speech)
 */
export function duckVolume(factor: number = 0.3): void {
  originalVolume = AUDIO_CONFIG.masterVolume;
  setGlobalVolume(originalVolume * factor);
}

/**
 * Restore normal volume
 */
export function restoreVolume(): void {
  setGlobalVolume(originalVolume);
}

// ============ Debug ============

export function getActiveSoundCount(): number {
  return activeSounds.size;
}

export function getActiveSoundsByCategory(): Record<SoundCategory, number> {
  const counts: Record<SoundCategory, number> = {
    background: 0,
    player: 0,
    enemy: 0,
    combo: 0,
    ui: 0,
    boss: 0,
  };

  activeSounds.forEach((sound) => {
    counts[sound.type]++;
  });

  return counts;
}
