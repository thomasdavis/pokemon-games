// Pokemon Starblast - Particle Renderer

import React from 'react';
import { Particle } from '../types';

interface ParticlesProps {
  particles: Particle[];
}

export default function Particles({ particles }: ParticlesProps) {
  return (
    <>
      {particles.map((particle) => {
        const opacity = particle.alpha ?? (particle.life / particle.maxLife);
        const scale = particle.scale ?? 1;
        const rotation = particle.rotation ?? 0;

        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none"
            style={{
              left: particle.x - particle.size / 2,
              top: particle.y - particle.size / 2,
              width: particle.size * scale,
              height: particle.size * scale,
              backgroundColor: particle.color,
              borderRadius: particle.type === 'star' ? '50%' :
                           particle.type === 'ice' ? '0' : '50%',
              opacity,
              transform: `rotate(${rotation}deg)`,
              boxShadow: particle.type === 'electric' ? `0 0 ${particle.size}px ${particle.color}` :
                        particle.type === 'flame' ? `0 0 ${particle.size * 2}px ${particle.color}` :
                        particle.type === 'combo' ? `0 0 ${particle.size * 3}px ${particle.color}` :
                        'none',
            }}
          />
        );
      })}
    </>
  );
}

// Star field background component
export function StarField({ particles }: { particles: Particle[] }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.filter(p => p.type === 'star').map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: star.color,
            opacity: star.alpha ?? 0.5,
          }}
        />
      ))}
    </div>
  );
}
