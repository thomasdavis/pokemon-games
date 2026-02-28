// Pokemon Starblast - Boss Introduction Component

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { BossDefinition } from '../types';
import { COLORS } from '../utils/constants';
import { announceBoss } from '../lib/speechDrama';
import { playBossSpawn } from '../lib/soundLayers';
import { useAI } from '../hooks/useAI';

interface BossIntroProps {
  boss: BossDefinition;
  onComplete: () => void;
}

export default function BossIntro({ boss, onComplete }: BossIntroProps) {
  const [phase, setPhase] = useState<'warning' | 'entrance' | 'threat' | 'ready'>('warning');
  const [entrance, setEntrance] = useState<string>('');
  const [threat, setThreat] = useState<string>('');
  const { getBossIntro } = useAI();

  const auraColor = COLORS.bossAura[boss.id as keyof typeof COLORS.bossAura] || '#ff0000';

  useEffect(() => {
    let mounted = true;

    // Play boss spawn sound
    playBossSpawn();

    const loadIntro = async () => {
      try {
        const result = await getBossIntro(boss);
        if (mounted) {
          setEntrance(result.entrance);
          setThreat(result.threat);
        }
      } catch {
        if (mounted) {
          setEntrance(`The legendary ${boss.name} has appeared!`);
          setThreat(boss.introDialogue);
        }
      }
    };

    loadIntro();

    // Phase timings
    const entranceTimeout = setTimeout(() => {
      if (mounted) {
        setPhase('entrance');
        // Speak entrance after a moment
        setTimeout(() => {
          announceBoss(entrance || `The legendary ${boss.name} has appeared!`, threat || boss.introDialogue);
        }, 500);
      }
    }, 1500);

    const threatTimeout = setTimeout(() => {
      if (mounted) setPhase('threat');
    }, 3500);

    const readyTimeout = setTimeout(() => {
      if (mounted) setPhase('ready');
    }, 5500);

    const completeTimeout = setTimeout(() => {
      if (mounted) onComplete();
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(entranceTimeout);
      clearTimeout(threatTimeout);
      clearTimeout(readyTimeout);
      clearTimeout(completeTimeout);
    };
  }, [boss, getBossIntro, entrance, threat, onComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden">
      {/* Dark overlay with vignette */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === 'warning' ? 'opacity-90' : 'opacity-70'
        }`}
        style={{
          background: `radial-gradient(circle at center, ${auraColor}20 0%, #000000 100%)`,
        }}
      />

      {/* Warning phase */}
      {phase === 'warning' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-500 text-6xl font-bold animate-pulse">
            ⚠️ WARNING ⚠️
          </div>
        </div>
      )}

      {/* Boss entrance */}
      {(phase === 'entrance' || phase === 'threat' || phase === 'ready') && (
        <div className="relative flex flex-col items-center">
          {/* Aura effect */}
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: auraColor, opacity: 0.5 }}
          />

          {/* Boss image container */}
          <div
            className={`relative transition-all duration-1000 ${
              phase === 'entrance' ? 'scale-0 rotate-180' :
              phase === 'ready' ? 'scale-90 opacity-80' :
              'scale-100 rotate-0'
            }`}
          >
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full animate-spin-slow"
              style={{
                border: `4px solid ${auraColor}`,
                boxShadow: `0 0 30px ${auraColor}, inset 0 0 30px ${auraColor}40`,
              }}
            />

            {/* Boss image */}
            <div className="relative p-8">
              <Image
                src={boss.pokemon.image}
                alt={boss.name}
                width={180}
                height={180}
                className="drop-shadow-2xl"
                style={{
                  filter: `drop-shadow(0 0 20px ${auraColor})`,
                }}
              />
            </div>
          </div>

          {/* Boss name */}
          <div
            className={`mt-4 transition-all duration-500 ${
              phase === 'entrance' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            <h1
              className="text-5xl font-bold text-center"
              style={{
                color: auraColor,
                textShadow: `0 0 20px ${auraColor}, 0 0 40px ${auraColor}`,
              }}
            >
              {boss.name}
            </h1>
            <div className="text-gray-400 text-center text-lg mt-1">
              Wave {boss.waveNumber} Boss
            </div>
          </div>

          {/* Entrance text */}
          {phase === 'entrance' && entrance && (
            <div className="mt-6 max-w-md text-center">
              <p className="text-gray-300 text-lg italic">
                "{entrance}"
              </p>
            </div>
          )}

          {/* Threat text (boss speaking) */}
          {phase === 'threat' && (
            <div className="mt-6 max-w-md">
              <div
                className="bg-gray-900/90 rounded-xl px-6 py-4 border-2"
                style={{ borderColor: auraColor }}
              >
                <p
                  className="text-xl font-bold text-center"
                  style={{ color: auraColor }}
                >
                  "{threat || boss.introDialogue}"
                </p>
              </div>
            </div>
          )}

          {/* Ready indicator */}
          {phase === 'ready' && (
            <div className="mt-6 text-yellow-400 text-2xl font-bold animate-pulse">
              GET READY!
            </div>
          )}
        </div>
      )}

      {/* Decorative corner elements */}
      <div
        className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 opacity-50"
        style={{ borderColor: auraColor }}
      />
      <div
        className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 opacity-50"
        style={{ borderColor: auraColor }}
      />
      <div
        className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 opacity-50"
        style={{ borderColor: auraColor }}
      />
      <div
        className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 opacity-50"
        style={{ borderColor: auraColor }}
      />

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Boss taunt popup (shown during fight)
export function BossTaunt({
  bossName,
  taunt,
  emotion,
  auraColor,
}: {
  bossName: string;
  taunt: string;
  emotion: string;
  auraColor: string;
}) {
  return (
    <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 animate-bounce-once">
      <div
        className="bg-gray-900/90 backdrop-blur rounded-xl px-6 py-3 border-2"
        style={{ borderColor: auraColor }}
      >
        <div className="text-gray-400 text-xs uppercase tracking-wide">
          {bossName}
        </div>
        <p
          className="text-lg font-bold"
          style={{ color: auraColor }}
        >
          "{taunt}"
        </p>
      </div>
    </div>
  );
}
