/**
 * PokéSense Storage System
 * Persistent game state using localStorage
 */

import { Achievement, ACHIEVEMENTS } from './gameTypes';

// Storage keys
const STORAGE_KEYS = {
  CAUGHT_POKEMON: 'pokesense_caught_pokemon',
  ACHIEVEMENTS: 'pokesense_achievements',
  STATS: 'pokesense_stats',
  SETTINGS: 'pokesense_settings',
  HIGH_SCORES: 'pokesense_high_scores',
  LAST_SESSION: 'pokesense_last_session',
} as const;

// Player statistics
export interface PlayerStats {
  totalCatches: number;
  totalAttempts: number;
  longestStreak: number;
  currentStreak: number;
  legendariesCaught: number;
  mythicalsCaught: number;
  skillChallengesCompleted: Record<string, number>;
  fastestCatch: number; // ms
  totalPlayTime: number; // ms
  sessionsPlayed: number;
  typeMasteryCounts: Record<string, number>;
  firstPlayDate: number;
  lastPlayDate: number;
}

// Game settings
export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard';
  speechEnabled: boolean;
  soundEnabled: boolean;
  speechRate: number;
  showParticles: boolean;
  showHints: boolean;
  autoAdvance: boolean;
}

// High scores
export interface HighScores {
  mostCatchesInSession: number;
  longestStreak: number;
  fastestCatch: number;
  mostTypesLearned: number;
}

// Last session info
export interface LastSession {
  timestamp: number;
  caughtCount: number;
  lastPokemonId: number | null;
  streak: number;
}

// Default values
const DEFAULT_STATS: PlayerStats = {
  totalCatches: 0,
  totalAttempts: 0,
  longestStreak: 0,
  currentStreak: 0,
  legendariesCaught: 0,
  mythicalsCaught: 0,
  skillChallengesCompleted: {},
  fastestCatch: Infinity,
  totalPlayTime: 0,
  sessionsPlayed: 0,
  typeMasteryCounts: {},
  firstPlayDate: Date.now(),
  lastPlayDate: Date.now(),
};

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'easy',
  speechEnabled: true,
  soundEnabled: true,
  speechRate: 0.9,
  showParticles: true,
  showHints: true,
  autoAdvance: false,
};

const DEFAULT_HIGH_SCORES: HighScores = {
  mostCatchesInSession: 0,
  longestStreak: 0,
  fastestCatch: Infinity,
  mostTypesLearned: 0,
};

// Check if localStorage is available
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Generic save/load functions
function saveToStorage<T>(key: string, data: T): boolean {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    return false;
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
}

// ============ CAUGHT POKEMON ============

export function saveCaughtPokemon(pokemonIds: number[]): boolean {
  return saveToStorage(STORAGE_KEYS.CAUGHT_POKEMON, pokemonIds);
}

export function loadCaughtPokemon(): number[] {
  return loadFromStorage<number[]>(STORAGE_KEYS.CAUGHT_POKEMON, []);
}

export function addCaughtPokemon(pokemonId: number): number[] {
  const current = loadCaughtPokemon();
  if (!current.includes(pokemonId)) {
    current.push(pokemonId);
    saveCaughtPokemon(current);
  }
  return current;
}

export function clearCaughtPokemon(): void {
  if (isStorageAvailable()) {
    localStorage.removeItem(STORAGE_KEYS.CAUGHT_POKEMON);
  }
}

// ============ ACHIEVEMENTS ============

export function saveAchievements(achievementIds: string[]): boolean {
  return saveToStorage(STORAGE_KEYS.ACHIEVEMENTS, achievementIds);
}

export function loadAchievements(): Achievement[] {
  const ids = loadFromStorage<string[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
  return ACHIEVEMENTS.filter(a => ids.includes(a.id)).map(a => ({
    ...a,
    unlockedAt: Date.now(), // Note: we don't persist unlock times currently
  }));
}

export function unlockAchievement(achievementId: string): Achievement | null {
  const current = loadFromStorage<string[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
  if (current.includes(achievementId)) return null; // Already unlocked

  current.push(achievementId);
  saveAchievements(current);

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  return achievement ? { ...achievement, unlockedAt: Date.now() } : null;
}

export function hasAchievement(achievementId: string): boolean {
  const current = loadFromStorage<string[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
  return current.includes(achievementId);
}

// ============ PLAYER STATS ============

export function saveStats(stats: PlayerStats): boolean {
  return saveToStorage(STORAGE_KEYS.STATS, stats);
}

export function loadStats(): PlayerStats {
  const stored = loadFromStorage<Partial<PlayerStats>>(STORAGE_KEYS.STATS, {});
  return { ...DEFAULT_STATS, ...stored };
}

export function updateStats(updates: Partial<PlayerStats>): PlayerStats {
  const current = loadStats();
  const updated = { ...current, ...updates, lastPlayDate: Date.now() };
  saveStats(updated);
  return updated;
}

export function incrementStat(key: keyof PlayerStats, amount: number = 1): PlayerStats {
  const current = loadStats();
  const currentValue = current[key];
  if (typeof currentValue === 'number') {
    return updateStats({ [key]: currentValue + amount } as Partial<PlayerStats>);
  }
  return current;
}

export function recordSkillCompletion(skillType: string): PlayerStats {
  const current = loadStats();
  const skillCounts = { ...current.skillChallengesCompleted };
  skillCounts[skillType] = (skillCounts[skillType] || 0) + 1;
  return updateStats({ skillChallengesCompleted: skillCounts });
}

export function recordTypeMastery(type: string): PlayerStats {
  const current = loadStats();
  const typeCounts = { ...current.typeMasteryCounts };
  typeCounts[type] = (typeCounts[type] || 0) + 1;
  return updateStats({ typeMasteryCounts: typeCounts });
}

// ============ SETTINGS ============

export function saveSettings(settings: GameSettings): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

export function loadSettings(): GameSettings {
  const stored = loadFromStorage<Partial<GameSettings>>(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function updateSettings(updates: Partial<GameSettings>): GameSettings {
  const current = loadSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}

// ============ HIGH SCORES ============

export function saveHighScores(scores: HighScores): boolean {
  return saveToStorage(STORAGE_KEYS.HIGH_SCORES, scores);
}

export function loadHighScores(): HighScores {
  const stored = loadFromStorage<Partial<HighScores>>(STORAGE_KEYS.HIGH_SCORES, {});
  return { ...DEFAULT_HIGH_SCORES, ...stored };
}

export function checkAndUpdateHighScore(
  category: keyof HighScores,
  value: number,
  isLowerBetter: boolean = false
): boolean {
  const current = loadHighScores();
  const currentValue = current[category];

  const isNewRecord = isLowerBetter
    ? value < currentValue
    : value > currentValue;

  if (isNewRecord) {
    const updated = { ...current, [category]: value };
    saveHighScores(updated);
    return true;
  }

  return false;
}

// ============ LAST SESSION ============

export function saveLastSession(session: LastSession): boolean {
  return saveToStorage(STORAGE_KEYS.LAST_SESSION, session);
}

export function loadLastSession(): LastSession | null {
  return loadFromStorage<LastSession | null>(STORAGE_KEYS.LAST_SESSION, null);
}

// ============ FULL GAME STATE ============

export interface FullGameState {
  caughtPokemon: number[];
  achievements: string[];
  stats: PlayerStats;
  settings: GameSettings;
  highScores: HighScores;
  lastSession: LastSession | null;
}

export function loadFullGameState(): FullGameState {
  return {
    caughtPokemon: loadCaughtPokemon(),
    achievements: loadFromStorage<string[]>(STORAGE_KEYS.ACHIEVEMENTS, []),
    stats: loadStats(),
    settings: loadSettings(),
    highScores: loadHighScores(),
    lastSession: loadLastSession(),
  };
}

export function resetAllData(): void {
  if (!isStorageAvailable()) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============ ACHIEVEMENT CHECKING ============

export function checkAchievements(
  caughtPokemon: number[],
  stats: PlayerStats,
  isLegendary: boolean,
  isMythical: boolean,
  catchTime: number
): Achievement[] {
  const newAchievements: Achievement[] = [];

  // First catch
  if (caughtPokemon.length === 1) {
    const a = unlockAchievement('first_catch');
    if (a) newAchievements.push(a);
  }

  // Collector achievements
  if (caughtPokemon.length >= 10) {
    const a = unlockAchievement('collector_10');
    if (a) newAchievements.push(a);
  }
  if (caughtPokemon.length >= 50) {
    const a = unlockAchievement('collector_50');
    if (a) newAchievements.push(a);
  }

  // Streak achievements
  if (stats.currentStreak >= 3) {
    const a = unlockAchievement('streak_3');
    if (a) newAchievements.push(a);
  }
  if (stats.currentStreak >= 5) {
    const a = unlockAchievement('streak_5');
    if (a) newAchievements.push(a);
  }

  // Legendary/Mythical
  if (isLegendary) {
    const a = unlockAchievement('legendary');
    if (a) newAchievements.push(a);
  }
  if (isMythical) {
    const a = unlockAchievement('mythical');
    if (a) newAchievements.push(a);
  }

  // Speed achievement (under 2 seconds)
  if (catchTime < 2000) {
    const a = unlockAchievement('speedster');
    if (a) newAchievements.push(a);
  }

  // Persistence achievement
  if (stats.totalAttempts > 3 && stats.totalCatches > 0) {
    const a = unlockAchievement('persistent');
    if (a) newAchievements.push(a);
  }

  // Type mastery
  const typeMatches = Object.values(stats.typeMasteryCounts).reduce((a, b) => a + b, 0);
  if (typeMatches >= 5) {
    const a = unlockAchievement('type_master');
    if (a) newAchievements.push(a);
  }

  return newAchievements;
}
