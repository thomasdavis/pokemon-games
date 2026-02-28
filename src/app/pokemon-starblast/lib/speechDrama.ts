// Pokemon Starblast - Dramatic Speech Profiles

import { speak, stopSpeaking, SpeechOptions, loadVoices } from '@/lib/speech';
import { SPEECH_PROFILES } from '../utils/constants';
import { SpeechProfile } from '../types';

// ============ Initialize Voices ============

let voicesLoaded = false;

export async function initializeSpeech(): Promise<void> {
  if (!voicesLoaded) {
    await loadVoices();
    voicesLoaded = true;
  }
}

// ============ Profile-Based Speech ============

export function speakWithProfile(
  text: string,
  profile: SpeechProfile,
  options?: Partial<SpeechOptions>
): void {
  speak(text, {
    rate: profile.rate,
    pitch: profile.pitch,
    volume: profile.volume,
    ...options,
  });
}

// ============ Dramatic Speech Functions ============

/**
 * Announce a new wave with epic announcer voice
 */
export function announceWave(
  announcement: string,
  battleCry: string,
  onComplete?: () => void
): void {
  speakWithProfile(announcement, SPEECH_PROFILES.waveAnnouncement, {
    onEnd: () => {
      // Small pause then battle cry
      setTimeout(() => {
        speakWithProfile(battleCry, {
          rate: 1.3,
          pitch: 1.2,
          volume: 1.0,
        }, {
          onEnd: onComplete,
        });
      }, 300);
    },
  });
}

/**
 * Boss entrance with deep, menacing voice
 */
export function announceBoss(
  entrance: string,
  threat: string,
  onComplete?: () => void
): void {
  // First the narrator describes the entrance
  speakWithProfile(entrance, SPEECH_PROFILES.bossIntro, {
    onEnd: () => {
      // Then the boss speaks
      setTimeout(() => {
        speakWithProfile(threat, {
          rate: 0.75,
          pitch: 0.5,
          volume: 1.0,
        }, {
          onEnd: onComplete,
        });
      }, 500);
    },
  });
}

/**
 * Boss taunt during fight - escalates with phase
 */
export function speakBossTaunt(
  taunt: string,
  phase: number,
  emotion: string
): void {
  // Pitch and rate escalate with phase and emotion
  const baseRate = SPEECH_PROFILES.bossTaunt.rate;
  const basePitch = SPEECH_PROFILES.bossTaunt.pitch;

  let rate = baseRate;
  let pitch = basePitch;

  // Adjust based on emotion
  switch (emotion) {
    case 'confident':
      rate = 0.8;
      pitch = 0.6;
      break;
    case 'angry':
      rate = 1.0;
      pitch = 0.7;
      break;
    case 'desperate':
      rate = 1.1;
      pitch = 0.8;
      break;
    case 'amused':
      rate = 0.85;
      pitch = 0.65;
      break;
  }

  // Phase escalation
  rate += phase * 0.1;
  pitch += phase * 0.1;

  speak(taunt, { rate, pitch, volume: 1.0 });
}

/**
 * Boss defeat - dramatic moment
 */
export function speakBossDefeat(
  defeatLine: string,
  onComplete?: () => void
): void {
  speakWithProfile(defeatLine, SPEECH_PROFILES.bossDefeat, {
    onEnd: onComplete,
  });
}

/**
 * Victory celebration - excited and fast
 */
export function speakVictory(
  celebration: string,
  statsComment?: string,
  onComplete?: () => void
): void {
  speakWithProfile(celebration, SPEECH_PROFILES.victory, {
    onEnd: () => {
      if (statsComment) {
        setTimeout(() => {
          speak(statsComment, {
            rate: 1.0,
            pitch: 1.1,
            volume: 0.9,
            onEnd: onComplete,
          });
        }, 500);
      } else {
        onComplete?.();
      }
    },
  });
}

/**
 * Defeat encouragement - supportive tone
 */
export function speakDefeat(
  encouragement: string,
  tip?: string,
  onComplete?: () => void
): void {
  speakWithProfile(encouragement, SPEECH_PROFILES.defeat, {
    onEnd: () => {
      if (tip) {
        setTimeout(() => {
          speak(tip, {
            rate: 0.9,
            pitch: 1.0,
            volume: 0.9,
            onEnd: onComplete,
          });
        }, 600);
      } else {
        onComplete?.();
      }
    },
  });
}

/**
 * Combo announcement - gets more excited with higher combos
 */
export function speakCombo(
  shout: string,
  comboCount: number
): void {
  // Escalate excitement with combo
  const baseProfile = SPEECH_PROFILES.combo;
  const escalation = Math.min(0.5, comboCount / 100);

  speak(shout, {
    rate: baseProfile.rate + escalation * 0.3,
    pitch: baseProfile.pitch + escalation * 0.2,
    volume: Math.min(1.0, baseProfile.volume + escalation * 0.1),
  });
}

/**
 * Power-up collection - quick and punchy
 */
export function speakPowerUp(name: string): void {
  speak(name, SPEECH_PROFILES.powerUp);
}

/**
 * Warning (low health, incoming attack)
 */
export function speakWarning(message: string): void {
  speak(message, SPEECH_PROFILES.warning);
}

/**
 * Player name announcement at game start
 */
export function announcePlayer(playerName: string, onComplete?: () => void): void {
  speak(`Go, ${playerName}! Your mission begins!`, {
    rate: 1.1,
    pitch: 1.0,
    volume: 1.0,
    onEnd: onComplete,
  });
}

/**
 * Countdown for game start
 */
export function speakCountdown(onComplete?: () => void): void {
  let count = 3;

  const countNext = () => {
    if (count > 0) {
      speak(count.toString(), {
        rate: 1.0,
        pitch: 0.9 + (4 - count) * 0.1,
        volume: 1.0,
        onEnd: () => {
          count--;
          setTimeout(countNext, 300);
        },
      });
    } else {
      speak('GO!', {
        rate: 1.3,
        pitch: 1.3,
        volume: 1.0,
        onEnd: onComplete,
      });
    }
  };

  countNext();
}

/**
 * Wave complete announcement
 */
export function speakWaveComplete(waveNumber: number): void {
  speak(`Wave ${waveNumber} complete!`, {
    rate: 1.2,
    pitch: 1.2,
    volume: 0.9,
  });
}

/**
 * Cancel any ongoing speech
 */
export function cancelSpeech(): void {
  stopSpeaking();
}

// ============ Speech Queue for Complex Sequences ============

interface SpeechQueueItem {
  text: string;
  profile: SpeechProfile;
  delay?: number;
}

let speechQueue: SpeechQueueItem[] = [];
let isProcessingQueue = false;

export function queueSpeech(items: SpeechQueueItem[]): void {
  speechQueue.push(...items);
  if (!isProcessingQueue) {
    processQueue();
  }
}

function processQueue(): void {
  if (speechQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const item = speechQueue.shift()!;

  if (item.delay) {
    setTimeout(() => {
      speakWithProfile(item.text, item.profile, {
        onEnd: processQueue,
      });
    }, item.delay);
  } else {
    speakWithProfile(item.text, item.profile, {
      onEnd: processQueue,
    });
  }
}

export function clearSpeechQueue(): void {
  speechQueue = [];
  isProcessingQueue = false;
  cancelSpeech();
}
