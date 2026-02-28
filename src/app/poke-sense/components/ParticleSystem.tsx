'use client';

/**
 * PokéSense Particle System
 * Floating animated particles for type-themed backgrounds
 */

import { useEffect, useState, memo } from 'react';
import { BackgroundTheme, Particle, generateParticles } from '../lib/backgrounds';

interface ParticleSystemProps {
  theme: BackgroundTheme;
  enabled?: boolean;
}

const ParticleComponent = memo(function ParticleComponent({ particle }: { particle: Particle }) {
  return (
    <div
      className="absolute pointer-events-none select-none animate-particle-float"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        fontSize: particle.size,
        opacity: particle.opacity,
        animationDelay: `${particle.delay}s`,
        animationDuration: `${8 + particle.speed * 4}s`,
        transform: `rotate(${particle.rotation}deg)`,
        '--rotation-speed': `${particle.rotationSpeed}`,
      } as React.CSSProperties}
    >
      {particle.emoji}
    </div>
  );
});

export function ParticleSystem({ theme, enabled = true }: ParticleSystemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!enabled) {
      setParticles([]);
      return;
    }

    setParticles(generateParticles(theme));
  }, [theme, enabled]);

  if (!enabled || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(particle => (
        <ParticleComponent key={particle.id} particle={particle} />
      ))}

      <style jsx global>{`
        @keyframes particle-float {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-30px) rotate(calc(var(--rotation-speed, 0.5) * 90deg));
          }
          50% {
            transform: translateY(-15px) rotate(calc(var(--rotation-speed, 0.5) * 180deg));
          }
          75% {
            transform: translateY(-45px) rotate(calc(var(--rotation-speed, 0.5) * 270deg));
          }
          100% {
            transform: translateY(0) rotate(calc(var(--rotation-speed, 0.5) * 360deg));
          }
        }
        .animate-particle-float {
          animation: particle-float ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
