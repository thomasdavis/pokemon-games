// Pokemon Starblast - Scoring System

import { GAME_CONFIG, SCORING } from './constants';

// ============ Combo System ============

export interface ComboState {
  count: number;
  timer: number;
  multiplier: number;
  maxCombo: number;
  totalKills: number;
}

export function createComboState(): ComboState {
  return {
    count: 0,
    timer: 0,
    multiplier: 1.0,
    maxCombo: 0,
    totalKills: 0,
  };
}

export function updateCombo(state: ComboState, delta: number): ComboState {
  if (state.count === 0) {
    return state;
  }

  const newTimer = state.timer - delta;

  if (newTimer <= 0) {
    // Combo expired
    return {
      ...state,
      count: 0,
      timer: 0,
      multiplier: 1.0,
    };
  }

  return {
    ...state,
    timer: newTimer,
  };
}

export function incrementCombo(state: ComboState): ComboState {
  const newCount = state.count + 1;
  const newMultiplier = Math.min(
    GAME_CONFIG.MAX_COMBO_MULTIPLIER,
    1.0 + newCount * GAME_CONFIG.COMBO_MULTIPLIER_INCREMENT
  );

  return {
    ...state,
    count: newCount,
    timer: GAME_CONFIG.COMBO_TIMEOUT,
    multiplier: newMultiplier,
    maxCombo: Math.max(state.maxCombo, newCount),
    totalKills: state.totalKills + 1,
  };
}

export function resetCombo(state: ComboState): ComboState {
  return {
    ...state,
    count: 0,
    timer: 0,
    multiplier: 1.0,
  };
}

// ============ Score Calculation ============

export interface ScoreResult {
  baseScore: number;
  comboBonus: number;
  waveBonus: number;
  totalScore: number;
}

export function calculateEnemyKillScore(
  waveNumber: number,
  comboMultiplier: number,
  baseValue: number = SCORING.ENEMY_BASE
): ScoreResult {
  // Base score scales with wave
  const waveMultiplier = Math.pow(GAME_CONFIG.SCORE_SCALE, waveNumber - 1);
  const baseScore = Math.floor(baseValue * waveMultiplier);

  // Combo bonus
  const comboBonus = Math.floor(baseScore * (comboMultiplier - 1));

  // Total
  const totalScore = baseScore + comboBonus;

  return {
    baseScore,
    comboBonus,
    waveBonus: Math.floor(baseScore * (waveMultiplier - 1)),
    totalScore,
  };
}

export function calculateBossHitScore(): number {
  return SCORING.BOSS_HIT;
}

export function calculateBossDefeatScore(bossNumber: number): number {
  return SCORING.BOSS_DEFEAT_MULTIPLIER * bossNumber;
}

export function calculateGrazeScore(): number {
  return SCORING.GRAZE;
}

export function calculatePowerUpScore(): number {
  return SCORING.POWERUP;
}

export function calculatePerfectWaveBonus(waveScore: number): number {
  return waveScore * (SCORING.PERFECT_WAVE_MULTIPLIER - 1);
}

export function calculateNoDamageBonus(): number {
  return SCORING.NO_DAMAGE_BONUS;
}

// ============ Combo Milestones ============

export type ComboMilestone = 5 | 10 | 25 | 50 | 100;

const COMBO_MILESTONES: ComboMilestone[] = [5, 10, 25, 50, 100];

export function getComboMilestone(count: number): ComboMilestone | null {
  const milestones = COMBO_MILESTONES.filter(m => count === m);
  return milestones.length > 0 ? milestones[0] : null;
}

export function getNextComboMilestone(count: number): ComboMilestone | null {
  return COMBO_MILESTONES.find(m => m > count) || null;
}

export function getComboMilestoneMessage(milestone: ComboMilestone): string {
  switch (milestone) {
    case 5:
      return 'Nice combo!';
    case 10:
      return 'Great combo!';
    case 25:
      return 'Amazing combo!';
    case 50:
      return 'Incredible combo!';
    case 100:
      return 'LEGENDARY COMBO!';
    default:
      return 'Combo!';
  }
}

export function getComboMilestoneColor(milestone: ComboMilestone): string {
  switch (milestone) {
    case 5:
      return '#22c55e'; // green
    case 10:
      return '#3b82f6'; // blue
    case 25:
      return '#a855f7'; // purple
    case 50:
      return '#f59e0b'; // amber
    case 100:
      return '#ef4444'; // red
    default:
      return '#ffffff';
  }
}

// ============ Score Display Formatting ============

export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}

export function formatComboMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(1)}x`;
}

// ============ High Score Management ============

const HIGH_SCORE_KEY = 'pokemon-starblast-highscore';

export function getHighScore(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(HIGH_SCORE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function saveHighScore(score: number): boolean {
  if (typeof window === 'undefined') return false;

  const currentHigh = getHighScore();
  if (score > currentHigh) {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString());
    return true;
  }
  return false;
}

// ============ Wave Statistics ============

export interface WaveStats {
  enemiesKilled: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  grazeCount: number;
  powerUpsCollected: number;
  maxCombo: number;
  waveScore: number;
  perfectWave: boolean;
}

export function createWaveStats(): WaveStats {
  return {
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageTaken: 0,
    grazeCount: 0,
    powerUpsCollected: 0,
    maxCombo: 0,
    waveScore: 0,
    perfectWave: true, // Becomes false if player takes damage
  };
}

export function calculateAccuracy(stats: WaveStats): number {
  if (stats.shotsFired === 0) return 0;
  return (stats.shotsHit / stats.shotsFired) * 100;
}

export function getWaveGrade(stats: WaveStats): string {
  const accuracy = calculateAccuracy(stats);
  const perfect = stats.perfectWave;
  const combo = stats.maxCombo;

  if (perfect && accuracy >= 80 && combo >= 25) return 'S';
  if (perfect && accuracy >= 60 && combo >= 15) return 'A';
  if (accuracy >= 50 && combo >= 10) return 'B';
  if (accuracy >= 40 && combo >= 5) return 'C';
  return 'D';
}

// ============ Game Statistics ============

export interface GameStats {
  totalScore: number;
  wavesCompleted: number;
  totalKills: number;
  totalShots: number;
  totalHits: number;
  maxCombo: number;
  powerUpsCollected: number;
  bossesDefeated: number;
  totalGrazes: number;
  playTime: number; // in seconds
}

export function createGameStats(): GameStats {
  return {
    totalScore: 0,
    wavesCompleted: 0,
    totalKills: 0,
    totalShots: 0,
    totalHits: 0,
    maxCombo: 0,
    powerUpsCollected: 0,
    bossesDefeated: 0,
    totalGrazes: 0,
    playTime: 0,
  };
}

export function calculateOverallAccuracy(stats: GameStats): number {
  if (stats.totalShots === 0) return 0;
  return (stats.totalHits / stats.totalShots) * 100;
}
