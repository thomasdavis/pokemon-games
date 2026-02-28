// Pokemon Starblast - AI Hook

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  generateWaveAnnouncement,
  generateBossIntro,
  generateBossTaunt,
  generateVictoryMessage,
  generateDefeatMessage,
  generateComboAnnouncement,
  getQuickWaveAnnouncement,
  getQuickBossIntro,
  getQuickComboMessage,
} from '../lib/aiPrompts';
import { BossDefinition } from '../types';

// ============ Types ============

interface AIState {
  isLoading: boolean;
  error: string | null;
  lastMessage: string | null;
}

interface CachedMessage {
  content: unknown;
  timestamp: number;
}

// ============ Cache ============

const messageCache = new Map<string, CachedMessage>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = messageCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.content as T;
  }
  return null;
}

function setCache(key: string, content: unknown): void {
  messageCache.set(key, { content, timestamp: Date.now() });
}

// ============ Main Hook ============

export function useAI() {
  const [state, setState] = useState<AIState>({
    isLoading: false,
    error: null,
    lastMessage: null,
  });

  const pendingRequests = useRef<Set<string>>(new Set());

  // ============ Wave Announcements ============

  const getWaveAnnouncement = useCallback(async (
    waveNumber: number,
    waveType: string,
    waveName: string,
    useAI: boolean = true
  ): Promise<{ announcement: string; battleCry: string }> => {
    const cacheKey = `wave_${waveNumber}`;

    // Check cache first
    const cached = getCached<{ announcement: string; battleCry: string }>(cacheKey);
    if (cached) return cached;

    // Prevent duplicate requests
    if (pendingRequests.current.has(cacheKey)) {
      return getQuickWaveAnnouncement(waveNumber, waveType, waveName);
    }

    if (!useAI) {
      const result = getQuickWaveAnnouncement(waveNumber, waveType, waveName);
      setCache(cacheKey, result);
      return result;
    }

    try {
      pendingRequests.current.add(cacheKey);
      setState(prev => ({ ...prev, isLoading: true }));

      const result = await generateWaveAnnouncement(waveNumber, waveType, waveName);
      setCache(cacheKey, result);
      setState(prev => ({ ...prev, isLoading: false, lastMessage: result.announcement }));

      return result;
    } catch (error) {
      console.warn('AI wave announcement failed, using fallback');
      const result = getQuickWaveAnnouncement(waveNumber, waveType, waveName);
      setCache(cacheKey, result);
      setState(prev => ({ ...prev, isLoading: false, error: 'AI unavailable' }));
      return result;
    } finally {
      pendingRequests.current.delete(cacheKey);
    }
  }, []);

  // ============ Boss Introductions ============

  const getBossIntro = useCallback(async (
    boss: BossDefinition,
    useAI: boolean = true
  ): Promise<{ entrance: string; threat: string }> => {
    const cacheKey = `boss_${boss.id}`;

    const cached = getCached<{ entrance: string; threat: string }>(cacheKey);
    if (cached) return cached;

    if (pendingRequests.current.has(cacheKey)) {
      return getQuickBossIntro(boss);
    }

    if (!useAI) {
      const result = getQuickBossIntro(boss);
      setCache(cacheKey, result);
      return result;
    }

    try {
      pendingRequests.current.add(cacheKey);
      setState(prev => ({ ...prev, isLoading: true }));

      const result = await generateBossIntro(boss);
      setCache(cacheKey, result);
      setState(prev => ({ ...prev, isLoading: false, lastMessage: result.entrance }));

      return result;
    } catch (error) {
      console.warn('AI boss intro failed, using fallback');
      const result = getQuickBossIntro(boss);
      setCache(cacheKey, result);
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } finally {
      pendingRequests.current.delete(cacheKey);
    }
  }, []);

  // ============ Boss Taunts ============

  const getBossTaunt = useCallback(async (
    boss: BossDefinition,
    healthPercent: number,
    phase: number
  ): Promise<{ taunt: string; emotion: string }> => {
    // Taunts are not cached - they should vary
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await generateBossTaunt(boss, healthPercent, phase);
      setState(prev => ({ ...prev, isLoading: false, lastMessage: result.taunt }));
      return result;
    } catch (error) {
      const taunts = [
        { taunt: "You cannot defeat me!", emotion: 'confident' },
        { taunt: "Feel my power!", emotion: 'angry' },
        { taunt: "This isn't over!", emotion: 'desperate' },
      ];
      setState(prev => ({ ...prev, isLoading: false }));
      return taunts[phase % taunts.length];
    }
  }, []);

  // ============ Victory Message ============

  const getVictoryMessage = useCallback(async (
    playerName: string,
    waveReached: number,
    finalScore: number,
    bossesDefeated: number
  ): Promise<{ celebration: string; stats: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await generateVictoryMessage(playerName, waveReached, finalScore, bossesDefeated);
      setState(prev => ({ ...prev, isLoading: false, lastMessage: result.celebration }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        celebration: `Amazing job, ${playerName}! You're a Pokemon space champion!`,
        stats: `${waveReached} waves and ${bossesDefeated} bosses defeated!`,
      };
    }
  }, []);

  // ============ Defeat Message ============

  const getDefeatMessage = useCallback(async (
    playerName: string,
    waveReached: number,
    killer: string | null
  ): Promise<{ encouragement: string; tip: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await generateDefeatMessage(playerName, waveReached, killer);
      setState(prev => ({ ...prev, isLoading: false, lastMessage: result.encouragement }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        encouragement: `Great effort, ${playerName}! You made it to wave ${waveReached}!`,
        tip: "Keep moving and watch for enemy patterns!",
      };
    }
  }, []);

  // ============ Combo Announcement ============

  const getComboAnnouncement = useCallback(async (
    comboCount: number,
    useAI: boolean = true
  ): Promise<{ shout: string; compliment: string }> => {
    const cacheKey = `combo_${comboCount}`;

    const cached = getCached<{ shout: string; compliment: string }>(cacheKey);
    if (cached) return cached;

    if (!useAI) {
      const result = getQuickComboMessage(comboCount);
      setCache(cacheKey, result);
      return result;
    }

    try {
      const result = await generateComboAnnouncement(comboCount);
      setCache(cacheKey, result);
      return result;
    } catch (error) {
      const result = getQuickComboMessage(comboCount);
      setCache(cacheKey, result);
      return result;
    }
  }, []);

  // ============ Preload Common Messages ============

  const preloadMessages = useCallback(async (waveNumbers: number[]) => {
    // Preload wave announcements in background
    for (const num of waveNumbers) {
      const waveType = ['fire', 'water', 'electric', 'grass'][num % 4];
      getWaveAnnouncement(num, waveType, `Wave ${num}`, true);
    }

    // Preload combo milestones
    [5, 10, 25, 50].forEach(combo => {
      getComboAnnouncement(combo, true);
    });
  }, [getWaveAnnouncement, getComboAnnouncement]);

  // ============ Clear Cache ============

  const clearCache = useCallback(() => {
    messageCache.clear();
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    lastMessage: state.lastMessage,

    // Methods
    getWaveAnnouncement,
    getBossIntro,
    getBossTaunt,
    getVictoryMessage,
    getDefeatMessage,
    getComboAnnouncement,
    preloadMessages,
    clearCache,
  };
}

// ============ Instant Messages (No AI, No Async) ============

export function useInstantMessages() {
  return {
    getWaveAnnouncement: getQuickWaveAnnouncement,
    getBossIntro: getQuickBossIntro,
    getComboMessage: getQuickComboMessage,
  };
}
