// Pokemon Starblast - Wave Announcement Component

import React, { useEffect, useState } from 'react';
import { WaveDefinition } from '../types';
import { WAVE_THEMES } from '../utils/constants';
import { announceWave } from '../lib/speechDrama';
import { useAI } from '../hooks/useAI';

interface WaveAnnouncerProps {
  wave: WaveDefinition;
  onComplete: () => void;
  playerName?: string;
}

export default function WaveAnnouncer({
  wave,
  onComplete,
  playerName,
}: WaveAnnouncerProps) {
  const [announcement, setAnnouncement] = useState<string>('');
  const [battleCry, setBattleCry] = useState<string>('');
  const [phase, setPhase] = useState<'entering' | 'showing' | 'exiting'>('entering');
  const { getWaveAnnouncement } = useAI();

  const theme = WAVE_THEMES[wave.type] || WAVE_THEMES.normal;

  useEffect(() => {
    let mounted = true;

    const loadAnnouncement = async () => {
      try {
        const result = await getWaveAnnouncement(wave.number, wave.type, wave.name);
        if (mounted) {
          setAnnouncement(result.announcement);
          setBattleCry(result.battleCry);

          // Speak the announcement
          setTimeout(() => {
            announceWave(result.announcement, result.battleCry);
          }, 500);
        }
      } catch {
        if (mounted) {
          setAnnouncement(`Wave ${wave.number}: ${wave.name}!`);
          setBattleCry("Let's go!");
        }
      }
    };

    loadAnnouncement();

    // Animation phases
    const enterTimeout = setTimeout(() => {
      if (mounted) setPhase('showing');
    }, 100);

    const exitTimeout = setTimeout(() => {
      if (mounted) setPhase('exiting');
    }, 2500);

    const completeTimeout = setTimeout(() => {
      if (mounted) onComplete();
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(enterTimeout);
      clearTimeout(exitTimeout);
      clearTimeout(completeTimeout);
    };
  }, [wave, getWaveAnnouncement, onComplete]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-500 ${
        phase === 'entering' ? 'opacity-0' :
        phase === 'exiting' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Dramatic background overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(circle at center, ${theme.background}40 0%, transparent 70%)`,
        }}
      />

      {/* Wave announcement card */}
      <div
        className={`relative transform transition-all duration-700 ${
          phase === 'entering' ? 'scale-50 -translate-y-20' :
          phase === 'exiting' ? 'scale-75 translate-y-10 opacity-0' :
          'scale-100 translate-y-0'
        }`}
      >
        {/* Glowing background */}
        <div
          className="absolute inset-0 blur-xl opacity-50"
          style={{ backgroundColor: theme.accent }}
        />

        {/* Main card */}
        <div
          className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl px-12 py-8 border-2"
          style={{ borderColor: theme.accent }}
        >
          {/* Wave number badge */}
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold text-lg"
            style={{
              backgroundColor: theme.background,
              color: 'white',
            }}
          >
            WAVE {wave.number}
          </div>

          {/* Wave name */}
          <h2
            className="text-4xl font-bold text-center mt-4 mb-2"
            style={{ color: theme.accent }}
          >
            {wave.name}
          </h2>

          {/* Type badge */}
          <div className="text-center mb-4">
            <span
              className="inline-block px-4 py-1 rounded-full text-sm font-bold uppercase"
              style={{
                backgroundColor: theme.background,
                color: 'white',
              }}
            >
              {wave.type}-type Pokemon
            </span>
          </div>

          {/* Announcement text */}
          {announcement && (
            <p className="text-gray-300 text-center text-lg max-w-md mx-auto">
              {announcement}
            </p>
          )}

          {/* Battle cry */}
          {battleCry && phase === 'showing' && (
            <div className="text-center mt-4 animate-pulse">
              <span className="text-2xl font-bold text-yellow-400">
                {battleCry}
              </span>
            </div>
          )}

          {/* Boss warning for boss waves */}
          {wave.bossWave && (
            <div className="mt-4 text-center">
              <span className="text-red-500 font-bold text-xl animate-pulse">
                ⚠️ BOSS INCOMING ⚠️
              </span>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full animate-pulse"
          style={{ backgroundColor: theme.accent }}
        />
        <div
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full animate-pulse"
          style={{ backgroundColor: theme.accent }}
        />
      </div>
    </div>
  );
}

// Compact wave indicator for HUD
export function WaveIndicator({
  waveNumber,
  waveName,
  waveType,
}: {
  waveNumber: number;
  waveName: string;
  waveType: string;
}) {
  const theme = WAVE_THEMES[waveType] || WAVE_THEMES.normal;

  return (
    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur rounded-xl px-4 py-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: theme.accent }}
      />
      <div>
        <div className="text-white font-bold text-sm">Wave {waveNumber}</div>
        <div className="text-gray-400 text-xs">{waveName}</div>
      </div>
    </div>
  );
}
