"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";

interface WildPokemon {
  id: string;
  pokemon: Pokemon;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface Sparkle {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface Confetti {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  vx: number;
  vy: number;
}

interface CatchAnimation {
  id: string;
  x: number;
  y: number;
  pokemonImage: string;
  stage: "pokeball" | "shake" | "caught";
}

// Get speed multiplier based on Pokemon rarity
function getSpeedMultiplier(p: Pokemon): number {
  if (p.is_legendary) return 2.5;
  if (p.is_mythical) return 2.0;
  return 1;
}

// Get random Pokemon for the field
function getRandomWildPokemon(): Pokemon {
  return pokemon[Math.floor(Math.random() * pokemon.length)];
}

// Create a wild Pokemon with random position and velocity
function createWildPokemon(areaWidth: number, areaHeight: number): WildPokemon {
  const poke = getRandomWildPokemon();
  const speedMult = getSpeedMultiplier(poke);
  const baseSpeed = 1 + Math.random() * 1.5;
  const angle = Math.random() * Math.PI * 2;
  const size = 70 + Math.random() * 30; // Size between 70-100

  return {
    id: `${poke.id}-${Date.now()}-${Math.random()}`,
    pokemon: poke,
    x: Math.random() * (areaWidth - size),
    y: Math.random() * (areaHeight - size),
    vx: Math.cos(angle) * baseSpeed * speedMult,
    vy: Math.sin(angle) * baseSpeed * speedMult,
    size,
  };
}

export default function CatchPage() {
  const [wildPokemon, setWildPokemon] = useState<WildPokemon[]>([]);
  const [caughtPokemon, setCaughtPokemon] = useState<Pokemon[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [catchAnimations, setCatchAnimations] = useState<CatchAnimation[]>([]);
  const [gameArea, setGameArea] = useState({ width: 800, height: 500 });
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize game area size
  useEffect(() => {
    const updateSize = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setGameArea({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Initialize wild Pokemon
  useEffect(() => {
    if (gameArea.width > 0 && gameArea.height > 0) {
      const initialPokemon: WildPokemon[] = [];
      for (let i = 0; i < 8; i++) {
        initialPokemon.push(createWildPokemon(gameArea.width, gameArea.height));
      }
      setWildPokemon(initialPokemon);
    }
  }, [gameArea.width, gameArea.height]);

  // Animation loop for moving Pokemon
  useEffect(() => {
    const animate = () => {
      setWildPokemon((prev) =>
        prev.map((p) => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;
          let newVx = p.vx;
          let newVy = p.vy;

          // Bounce off walls
          if (newX <= 0 || newX >= gameArea.width - p.size) {
            newVx = -newVx;
            newX = Math.max(0, Math.min(newX, gameArea.width - p.size));
          }
          if (newY <= 0 || newY >= gameArea.height - p.size) {
            newVy = -newVy;
            newY = Math.max(0, Math.min(newY, gameArea.height - p.size));
          }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy };
        })
      );

      // Animate confetti
      setConfetti((prev) =>
        prev
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 0.2, // gravity
            rotation: c.rotation + 5,
          }))
          .filter((c) => c.y < gameArea.height + 100)
      );

      // Remove old sparkles
      setSparkles((prev) => prev.filter(() => Math.random() > 0.1));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameArea]);

  // Create sparkles at position
  const createSparkles = useCallback((x: number, y: number) => {
    const colors = ["#FFD700", "#FF69B4", "#00CED1", "#FF6347", "#98FB98", "#DDA0DD"];
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 12; i++) {
      newSparkles.push({
        id: `sparkle-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setSparkles((prev) => [...prev, ...newSparkles]);
  }, []);

  // Create confetti burst
  const createConfetti = useCallback((x: number, y: number) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];
    const newConfetti: Confetti[] = [];
    for (let i = 0; i < 30; i++) {
      newConfetti.push({
        id: `confetti-${Date.now()}-${i}`,
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 10 - 5,
      });
    }
    setConfetti((prev) => [...prev, ...newConfetti]);
  }, []);

  // Handle catching a Pokemon
  const handleCatch = useCallback(
    (wild: WildPokemon) => {
      // Remove from wild Pokemon
      setWildPokemon((prev) => prev.filter((p) => p.id !== wild.id));

      // Start catch animation
      const animId = `anim-${Date.now()}`;
      setCatchAnimations((prev) => [
        ...prev,
        {
          id: animId,
          x: wild.x,
          y: wild.y,
          pokemonImage: wild.pokemon.image,
          stage: "pokeball",
        },
      ]);

      // Animate through stages
      setTimeout(() => {
        setCatchAnimations((prev) =>
          prev.map((a) => (a.id === animId ? { ...a, stage: "shake" } : a))
        );
      }, 300);

      setTimeout(() => {
        setCatchAnimations((prev) =>
          prev.map((a) => (a.id === animId ? { ...a, stage: "caught" } : a))
        );
        createSparkles(wild.x + wild.size / 2, wild.y + wild.size / 2);
        createConfetti(wild.x + wild.size / 2, wild.y + wild.size / 2);
      }, 1000);

      setTimeout(() => {
        setCatchAnimations((prev) => prev.filter((a) => a.id !== animId));
        // Add to caught collection
        setCaughtPokemon((prev) => {
          if (!prev.find((p) => p.id === wild.pokemon.id)) {
            return [...prev, wild.pokemon];
          }
          return prev;
        });
        // Spawn a new Pokemon
        setWildPokemon((prev) => [
          ...prev,
          createWildPokemon(gameArea.width, gameArea.height),
        ]);
      }, 1500);
    },
    [createSparkles, createConfetti, gameArea]
  );

  // Reset game
  const resetGame = useCallback(() => {
    setCaughtPokemon([]);
    setSparkles([]);
    setConfetti([]);
    setCatchAnimations([]);
    const newPokemon: WildPokemon[] = [];
    for (let i = 0; i < 8; i++) {
      newPokemon.push(createWildPokemon(gameArea.width, gameArea.height));
    }
    setWildPokemon(newPokemon);
  }, [gameArea]);

  return (
    <div className="py-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent mb-2">
          Pokemon Catch!
        </h1>
        <p className="text-lg text-gray-600">Click on Pokemon to catch them!</p>
      </div>

      {/* Stats Bar */}
      <div className="flex justify-center gap-4 mb-4 flex-wrap">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 rounded-full shadow-lg">
          <span className="text-white font-bold text-xl">
            Caught: {caughtPokemon.length} / 1008
          </span>
        </div>
        <button
          onClick={resetGame}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          Release All & Start Fresh!
        </button>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative w-full h-[500px] bg-gradient-to-b from-sky-300 via-green-200 to-green-400 rounded-3xl overflow-hidden shadow-2xl border-4 border-yellow-400"
        style={{ cursor: "crosshair" }}
      >
        {/* Decorative elements */}
        <div className="absolute top-4 right-8 text-6xl animate-pulse">
          <span className="drop-shadow-lg">*</span>
        </div>
        <div className="absolute top-12 left-12 text-4xl animate-bounce">
          <span className="drop-shadow-lg">*</span>
        </div>

        {/* Grass tufts */}
        <div className="absolute bottom-0 left-0 right-0 h-20 flex justify-around items-end pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="text-green-600 text-3xl"
              style={{ transform: `rotate(${(i % 3 - 1) * 10}deg)` }}
            >
              ^
            </div>
          ))}
        </div>

        {/* Wild Pokemon */}
        {wildPokemon.map((wild) => (
          <div
            key={wild.id}
            className="absolute cursor-pointer transition-transform hover:scale-110 active:scale-90"
            style={{
              left: wild.x,
              top: wild.y,
              width: wild.size,
              height: wild.size,
            }}
            onClick={() => handleCatch(wild)}
          >
            <div
              className={`relative w-full h-full ${
                wild.pokemon.is_legendary
                  ? "animate-pulse drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                  : wild.pokemon.is_mythical
                  ? "animate-pulse drop-shadow-[0_0_10px_rgba(200,100,255,0.8)]"
                  : ""
              }`}
            >
              <Image
                src={wild.pokemon.image}
                alt={wild.pokemon.name}
                fill
                className="object-contain drop-shadow-lg"
                draggable={false}
              />
              {/* Legendary glow effect */}
              {wild.pokemon.is_legendary && (
                <div className="absolute inset-0 rounded-full bg-yellow-400/30 animate-ping" />
              )}
              {/* Mythical glow effect */}
              {wild.pokemon.is_mythical && (
                <div className="absolute inset-0 rounded-full bg-purple-400/30 animate-ping" />
              )}
            </div>
          </div>
        ))}

        {/* Catch Animations */}
        {catchAnimations.map((anim) => (
          <div
            key={anim.id}
            className="absolute pointer-events-none"
            style={{
              left: anim.x,
              top: anim.y,
              width: 80,
              height: 80,
            }}
          >
            {anim.stage === "pokeball" && (
              <div className="w-full h-full flex items-center justify-center animate-bounce">
                <div className="w-16 h-16 relative">
                  {/* Pokeball */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 via-red-500 to-white border-4 border-gray-800 overflow-hidden">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-800 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800" />
                  </div>
                </div>
              </div>
            )}
            {anim.stage === "shake" && (
              <div className="w-full h-full flex items-center justify-center animate-wiggle">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 via-red-500 to-white border-4 border-gray-800 overflow-hidden">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-800 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800" />
                  </div>
                </div>
              </div>
            )}
            {anim.stage === "caught" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-5xl animate-bounce">*</div>
              </div>
            )}
          </div>
        ))}

        {/* Sparkles */}
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute pointer-events-none animate-ping"
            style={{
              left: sparkle.x,
              top: sparkle.y,
              color: sparkle.color,
            }}
          >
            <span className="text-2xl">*</span>
          </div>
        ))}

        {/* Confetti */}
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute pointer-events-none w-3 h-3 rounded-sm"
            style={{
              left: c.x,
              top: c.y,
              backgroundColor: c.color,
              transform: `rotate(${c.rotation}deg)`,
            }}
          />
        ))}

        {/* Instructions overlay for empty state */}
        {wildPokemon.length === 0 && catchAnimations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-3xl">
            <div className="text-white text-2xl font-bold animate-pulse">
              Loading Pokemon...
            </div>
          </div>
        )}
      </div>

      {/* Caught Collection */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-center text-purple-600 mb-3">
          Your Collection
        </h2>
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 min-h-[120px] shadow-inner">
          {caughtPokemon.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-xl">No Pokemon caught yet!</p>
              <p className="text-lg">Click on the Pokemon above to catch them!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {caughtPokemon
                .sort((a, b) => a.id - b.id)
                .map((poke) => (
                  <div
                    key={poke.id}
                    className="relative group"
                  >
                    <div
                      className={`w-16 h-16 bg-white rounded-xl p-1 shadow-md border-2 ${
                        poke.is_legendary
                          ? "border-yellow-400 bg-gradient-to-br from-yellow-100 to-orange-100"
                          : poke.is_mythical
                          ? "border-purple-400 bg-gradient-to-br from-purple-100 to-pink-100"
                          : "border-gray-200"
                      } transition-transform hover:scale-110`}
                    >
                      <Image
                        src={poke.image}
                        alt={poke.name}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      #{poke.id} {poke.name}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Fun tip */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-sm">
          Tip: Legendary Pokemon (golden glow) and Mythical Pokemon (purple glow) are faster and harder to catch!
        </p>
      </div>

      {/* Custom animation styles */}
      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          25% { transform: rotate(5deg); }
          50% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
