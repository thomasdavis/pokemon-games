'use client';

/**
 * PokéSense Celebration Effects
 * Visual feedback for catching Pokemon and achievements
 */

import { useEffect, useState } from 'react';

interface CelebrationEffectsProps {
  active: boolean;
  intensity?: 'normal' | 'legendary' | 'mythical';
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  emoji: string;
  scale: number;
  rotation: number;
  delay: number;
  duration: number;
}

const normalEmojis = ['✨', '⭐', '🎉', '🎊', '💫', '🌟'];
const legendaryEmojis = ['👑', '✨', '⭐', '🏆', '💎', '🌟', '🔥'];
const mythicalEmojis = ['✨', '💜', '🔮', '💫', '🦄', '🌈', '💖'];

export function CelebrationEffects({ active, intensity = 'normal' }: CelebrationEffectsProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    if (!active) {
      setConfetti([]);
      return;
    }

    const emojis =
      intensity === 'legendary'
        ? legendaryEmojis
        : intensity === 'mythical'
        ? mythicalEmojis
        : normalEmojis;

    const count = intensity === 'normal' ? 30 : 50;

    const newConfetti: Confetti[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      scale: 0.5 + Math.random() * 1,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
    }));

    setConfetti(newConfetti);

    // Clear after animation
    const timeout = setTimeout(() => {
      setConfetti([]);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [active, intensity]);

  if (confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            fontSize: `${c.scale * 2}rem`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            transform: `rotate(${c.rotation}deg)`,
          }}
        >
          {c.emoji}
        </div>
      ))}

      {/* Center burst effect */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`w-64 h-64 rounded-full animate-burst ${
            intensity === 'legendary'
              ? 'bg-yellow-400/30'
              : intensity === 'mythical'
              ? 'bg-purple-400/30'
              : 'bg-white/30'
          }`}
        />
      </div>

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall ease-in forwards;
        }
        @keyframes burst {
          0% {
            transform: scale(0);
            opacity: 0.8;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        .animate-burst {
          animation: burst 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Achievement popup component
interface AchievementPopupProps {
  achievement: {
    name: string;
    description: string;
    icon: string;
  } | null;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  useEffect(() => {
    if (achievement) {
      const timeout = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timeout);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-achievement-popup">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{achievement.icon}</span>
          <div>
            <p className="text-sm font-medium opacity-90">Achievement Unlocked!</p>
            <h3 className="text-2xl font-bold">{achievement.name}</h3>
            <p className="text-sm opacity-90">{achievement.description}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes achievement-popup {
          0% {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          15% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          85% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
        }
        .animate-achievement-popup {
          animation: achievement-popup 5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
