'use client';

/**
 * PokéSense Skill Challenge Components
 * Polished, full-size skill mini-games with gentle motor skill requirements
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Pokemon, typeColors } from '@/data/pokemon';
import { SkillType, DifficultySettings } from '../lib/gameTypes';
import { playSound } from '@/lib/sounds';

interface SkillChallengeProps {
  pokemon: Pokemon;
  skillType: SkillType;
  difficulty: DifficultySettings;
  isActive: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onProgress: (progress: number) => void;
}

// ============ AIM CHALLENGE ============
// Pokemon GO style - click when shrinking circle is in the target zone!

export function AimChallenge({
  pokemon,
  difficulty,
  isActive,
  onSuccess,
  onFailure,
}: SkillChallengeProps) {
  const [circleSize, setCircleSize] = useState(350);
  const [isInZone, setIsInZone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Target zone: when circle is between 100px and 200px, it's "in the zone"
  const targetMin = 100;
  const targetMax = 200;
  const pokemonSize = 180;

  useEffect(() => {
    if (!isActive) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setCircleSize(prev => {
        let newSize = prev - delta * 80; // Slower shrink for kids

        if (newSize < 40) {
          newSize = 350;
        }

        setIsInZone(newSize >= targetMin && newSize <= targetMax);
        return newSize;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  const handleClick = useCallback(() => {
    if (!isActive) return;

    if (circleSize >= targetMin && circleSize <= targetMax) {
      playSound('success');
      onSuccess();
    } else {
      playSound('pop');
      onFailure();
    }
  }, [isActive, circleSize, onSuccess, onFailure]);

  const getCircleColor = () => {
    if (circleSize >= targetMin && circleSize <= targetMax) {
      return '#22c55e';
    } else if (circleSize > targetMax && circleSize <= targetMax + 60) {
      return '#eab308';
    } else if (circleSize < targetMin && circleSize >= targetMin - 40) {
      return '#eab308';
    } else {
      return '#ef4444';
    }
  };

  const getFeedbackText = () => {
    if (circleSize >= targetMin && circleSize <= targetMax) {
      return '🎯 CLICK NOW!';
    } else if (circleSize > targetMax) {
      return 'Wait for it...';
    } else {
      return 'Too small! Wait...';
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] cursor-pointer select-none flex items-center justify-center bg-gradient-to-b from-white/10 to-white/5 rounded-3xl"
      onClick={handleClick}
    >
      {/* Target zone indicator */}
      <div className="absolute pointer-events-none">
        <div
          className="rounded-full border-4 border-dashed border-green-400/40"
          style={{ width: targetMax + 40, height: targetMax + 40 }}
        />
      </div>

      {/* Pokemon in center */}
      <div className="relative z-10">
        <div
          className={`bg-white/50 backdrop-blur-sm rounded-full p-6 shadow-2xl transition-all duration-150 ${
            isInZone ? 'scale-110 ring-8 ring-green-400 ring-opacity-80' : ''
          }`}
        >
          <Image
            src={`/pokemon/${pokemon.id}.png`}
            alt={pokemon.name}
            width={pokemonSize}
            height={pokemonSize}
            className="drop-shadow-xl pointer-events-none"
          />
        </div>
      </div>

      {/* Shrinking targeting circle */}
      {isActive && (
        <div
          className="absolute pointer-events-none z-20 transition-colors duration-100"
          style={{
            width: circleSize,
            height: circleSize,
            border: `8px solid ${getCircleColor()}`,
            borderRadius: '50%',
            boxShadow: `0 0 30px ${getCircleColor()}80, inset 0 0 20px ${getCircleColor()}40`,
          }}
        />
      )}

      {/* Feedback indicator */}
      <div
        className={`absolute top-6 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full font-bold text-2xl z-30 transition-all duration-150 ${
          isInZone
            ? 'bg-green-500 text-white scale-110 animate-bounce'
            : 'bg-white/90 text-gray-700'
        }`}
      >
        {getFeedbackText()}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl px-8 py-4 z-30 shadow-xl">
        <p className="text-xl font-bold text-gray-800 text-center">
          Click when the circle turns <span className="text-green-500">GREEN</span>!
        </p>
      </div>
    </div>
  );
}

// ============ TRACK CHALLENGE ============
// Keep cursor on Pokemon for required time

export function TrackChallenge({
  pokemon,
  difficulty,
  isActive,
  onSuccess,
  onProgress,
}: SkillChallengeProps) {
  const [progress, setProgress] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [pokemonPos, setPokemonPos] = useState({ x: 50, y: 50 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const moveRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const movePokemon = () => {
      setPokemonPos({
        x: 25 + Math.random() * 50,
        y: 25 + Math.random() * 50,
      });
    };

    movePokemon();
    moveRef.current = setInterval(movePokemon, 3000);

    return () => {
      if (moveRef.current) clearInterval(moveRef.current);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (isTracking) {
          const newProgress = Math.min(prev + 1.5, 100);
          onProgress(newProgress);

          if (newProgress >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            playSound('success');
            onSuccess();
            return 100;
          }
          return newProgress;
        } else {
          return Math.max(0, prev - 0.8);
        }
      });
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isTracking, onSuccess, onProgress]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const distance = Math.sqrt(
      Math.pow(x - pokemonPos.x, 2) + Math.pow(y - pokemonPos.y, 2)
    );

    const wasTracking = isTracking;
    const nowTracking = distance < 18;
    setIsTracking(nowTracking);

    if (nowTracking && !wasTracking) {
      playSound('pop');
    }
  }, [isActive, pokemonPos, isTracking]);

  const handleMouseLeave = useCallback(() => {
    setIsTracking(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] bg-gradient-to-b from-white/10 to-white/5 rounded-3xl cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pokemon with position */}
      <div
        className="absolute transition-all duration-1000 ease-in-out z-10"
        style={{
          left: `${pokemonPos.x}%`,
          top: `${pokemonPos.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className={`bg-white/50 backdrop-blur-sm rounded-full p-6 shadow-2xl transition-all duration-200 ${
            isTracking ? 'ring-8 ring-green-400 ring-opacity-80 scale-110' : ''
          }`}
        >
          <Image
            src={`/pokemon/${pokemon.id}.png`}
            alt={pokemon.name}
            width={160}
            height={160}
            className="drop-shadow-xl pointer-events-none"
          />
        </div>

        {/* Progress ring */}
        <svg
          className="absolute -inset-6 pointer-events-none"
          viewBox="0 0 200 200"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={isTracking ? '#4ade80' : '#fbbf24'}
            strokeWidth="10"
            strokeDasharray={`${(progress / 100) * 565} 565`}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 z-20">
        <div className="bg-white/60 rounded-full h-8 overflow-hidden shadow-xl">
          <div
            className={`h-full transition-all duration-100 ${isTracking ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center mt-3 font-bold text-white drop-shadow-lg text-xl">
          {Math.floor(progress)}% - {isTracking ? '🎯 Keep going!' : `Move to ${pokemon.name}!`}
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl px-8 py-4 z-20 shadow-xl">
        <p className="text-xl font-bold text-gray-800 text-center">
          Keep your mouse on {pokemon.name} until the bar fills up!
        </p>
      </div>
    </div>
  );
}

// ============ DODGE CHALLENGE ============
// Pokemon bounces around - click to catch it!

export function DodgeChallenge({
  pokemon,
  difficulty,
  isActive,
  onSuccess,
  onFailure,
}: SkillChallengeProps) {
  const [pokemonPos, setPokemonPos] = useState({ x: 50, y: 50 });
  const [velocity, setVelocity] = useState({ vx: 2.5, vy: 2 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize with random direction
  useEffect(() => {
    if (!isActive) return;

    // Random starting position
    setPokemonPos({
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    });

    // Random velocity direction (slower for kids)
    const speed = 1.5 + difficulty.obstacleSpeed * 0.3;
    const angle = Math.random() * Math.PI * 2;
    setVelocity({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }, [isActive, difficulty.obstacleSpeed]);

  // Animate Pokemon bouncing around
  useEffect(() => {
    if (!isActive) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 16;
      lastTime = currentTime;

      setPokemonPos(prev => {
        let newX = prev.x + velocity.vx * delta;
        let newY = prev.y + velocity.vy * delta;

        // Bounce off walls (keep Pokemon inside the box)
        if (newX < 12 || newX > 88) {
          setVelocity(v => ({ ...v, vx: -v.vx }));
          newX = Math.max(12, Math.min(88, newX));
        }
        if (newY < 12 || newY > 88) {
          setVelocity(v => ({ ...v, vy: -v.vy }));
          newY = Math.max(12, Math.min(88, newY));
        }

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, velocity]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked on Pokemon (generous hitbox for kids)
    const distToPokemon = Math.sqrt(
      Math.pow(x - pokemonPos.x, 2) + Math.pow(y - pokemonPos.y, 2)
    );

    if (distToPokemon < 15) {
      playSound('success');
      onSuccess();
    } else {
      playSound('pop');
      onFailure();
    }
  }, [isActive, pokemonPos, onSuccess, onFailure]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const distToPokemon = Math.sqrt(
      Math.pow(x - pokemonPos.x, 2) + Math.pow(y - pokemonPos.y, 2)
    );
    setIsHovering(distToPokemon < 15);
  }, [pokemonPos]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] cursor-crosshair select-none bg-gradient-to-b from-white/10 to-white/5 rounded-3xl overflow-hidden"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {/* Bouncing area border */}
      <div className="absolute inset-4 border-4 border-dashed border-white/30 rounded-2xl pointer-events-none" />

      {/* Bouncing Pokemon */}
      <div
        className="absolute z-10 transition-transform duration-75"
        style={{
          left: `${pokemonPos.x}%`,
          top: `${pokemonPos.y}%`,
          transform: `translate(-50%, -50%) ${isHovering ? 'scale(1.15)' : 'scale(1)'}`,
        }}
      >
        <div className={`bg-white/50 backdrop-blur-sm rounded-full p-5 shadow-2xl transition-all duration-100 ${
          isHovering ? 'ring-8 ring-green-400 ring-opacity-80' : ''
        }`}>
          <Image
            src={`/pokemon/${pokemon.id}.png`}
            alt={pokemon.name}
            width={140}
            height={140}
            className="drop-shadow-xl pointer-events-none"
          />
        </div>
      </div>

      {/* Animated sparkles around the area */}
      <div className="absolute top-8 left-8 text-3xl animate-bounce opacity-60">✨</div>
      <div className="absolute top-8 right-8 text-3xl animate-bounce opacity-60" style={{ animationDelay: '0.2s' }}>⭐</div>
      <div className="absolute bottom-16 left-8 text-3xl animate-bounce opacity-60" style={{ animationDelay: '0.4s' }}>💫</div>
      <div className="absolute bottom-16 right-8 text-3xl animate-bounce opacity-60" style={{ animationDelay: '0.6s' }}>🌟</div>

      {/* Instructions */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl px-8 py-4 z-20 shadow-xl">
        <p className="text-xl font-bold text-gray-800 text-center">
          Catch {pokemon.name}! Click when it bounces near you!
        </p>
      </div>
    </div>
  );
}

// ============ TYPE MATCH CHALLENGE ============
// Click correct type

export function TypeMatchChallenge({
  pokemon,
  difficulty,
  isActive,
  onSuccess,
  onFailure,
}: SkillChallengeProps) {
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const correctType = pokemon.types[0];

  useEffect(() => {
    if (!isActive) return;

    const allTypes = [
      'Fire', 'Water', 'Grass', 'Electric', 'Ghost', 'Psychic',
      'Ice', 'Dragon', 'Dark', 'Fairy', 'Fighting', 'Rock',
      'Ground', 'Steel', 'Poison', 'Bug', 'Flying', 'Normal',
    ];

    // Normalize correct type
    const normalizedCorrect = correctType.charAt(0).toUpperCase() + correctType.slice(1).toLowerCase();

    const wrongTypes = allTypes
      .filter(t => t.toLowerCase() !== correctType.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(difficulty.typeOptionsCount - 1, 5));

    const options = [...wrongTypes, normalizedCorrect].sort(() => Math.random() - 0.5);
    setTypeOptions(options);
    setSelectedType(null);
  }, [isActive, correctType, difficulty.typeOptionsCount]);

  const handleTypeClick = useCallback((type: string) => {
    if (!isActive || selectedType) return;

    setSelectedType(type);
    const isCorrect = type.toLowerCase() === correctType.toLowerCase();

    setTimeout(() => {
      if (isCorrect) {
        playSound('success');
        onSuccess();
      } else {
        playSound('error');
        onFailure();
      }
    }, 300);
  }, [isActive, correctType, selectedType, onSuccess, onFailure]);

  return (
    <div className="relative w-full h-[500px] flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-white/10 to-white/5 rounded-3xl">
      {/* Pokemon display */}
      <div className="bg-white/50 backdrop-blur-sm rounded-full p-6 shadow-2xl">
        <Image
          src={`/pokemon/${pokemon.id}.png`}
          alt={pokemon.name}
          width={180}
          height={180}
          className="drop-shadow-xl"
        />
        <div className="text-center mt-3">
          <span className="bg-white/90 px-6 py-2 rounded-full font-bold text-xl text-gray-800 shadow-lg">
            {pokemon.name}
          </span>
        </div>
      </div>

      {/* Type options */}
      <div className="flex flex-wrap justify-center gap-4 max-w-2xl px-4">
        {typeOptions.map(type => {
          const isSelected = selectedType === type;
          const isCorrect = type.toLowerCase() === correctType.toLowerCase();
          const showResult = selectedType !== null;

          return (
            <button
              key={type}
              onClick={() => handleTypeClick(type)}
              disabled={selectedType !== null}
              className={`px-10 py-5 rounded-full text-white text-2xl font-bold shadow-xl transition-all duration-200 ${
                showResult
                  ? isCorrect
                    ? 'ring-8 ring-green-400 scale-110'
                    : isSelected
                    ? 'ring-8 ring-red-400 opacity-60 scale-95'
                    : 'opacity-40 scale-90'
                  : 'hover:scale-110 hover:shadow-2xl active:scale-95'
              }`}
              style={{
                backgroundColor: typeColors[type] || typeColors[type.toLowerCase()] || '#888',
              }}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl px-8 py-4 shadow-xl">
        <p className="text-xl font-bold text-gray-800 text-center">
          What type is {pokemon.name}? Click the answer!
        </p>
      </div>
    </div>
  );
}

// ============ SKILL CHALLENGE WRAPPER ============

interface SkillChallengeWrapperProps {
  pokemon: Pokemon;
  skillType: SkillType;
  difficulty: DifficultySettings;
  isActive: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onProgress: (progress: number) => void;
}

export function SkillChallengeWrapper(props: SkillChallengeWrapperProps) {
  switch (props.skillType) {
    case 'aim':
      return <AimChallenge {...props} />;
    case 'track':
      return <TrackChallenge {...props} />;
    case 'dodge':
      return <DodgeChallenge {...props} />;
    case 'typematch':
      return <TypeMatchChallenge {...props} />;
    default:
      return <AimChallenge {...props} />;
  }
}
