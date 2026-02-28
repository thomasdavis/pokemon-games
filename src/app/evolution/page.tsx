"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { evolutionChains as evolutionChainsMap, Pokemon } from "@/data/pokemon";

// Import utility packages
import { playSound } from "@/lib/sounds";
import { announcePokemon, speak, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Game evolution chain type
interface GameEvolutionChain {
  pokemon: Pokemon[];
  name: string;
}

interface EvolutionPokemon {
  id: number;
  name: string;
  image: string;
  position: number; // correct position in evolution chain (0, 1, 2)
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Build game evolution chains from the database - filter to only 3-pokemon chains
function buildGameEvolutionChains(): GameEvolutionChain[] {
  const chains: GameEvolutionChain[] = [];

  evolutionChainsMap.forEach((pokemonList) => {
    // Only include chains with exactly 3 Pokemon (for the game mechanic)
    if (pokemonList.length === 3) {
      // The chain is already sorted by ID which roughly corresponds to evolution order
      const firstName = pokemonList[0].name;
      chains.push({
        pokemon: pokemonList,
        name: `${firstName} Family`,
      });
    }
  });

  return chains;
}

export default function EvolutionPage() {
  // Get player data
  const { name: playerName } = usePlayer();

  // Build the evolution chains once from database data
  const gameEvolutionChains = useMemo(() => buildGameEvolutionChains(), []);

  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [shuffledPokemon, setShuffledPokemon] = useState<EvolutionPokemon[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [wrongClick, setWrongClick] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [shuffledChainIndices, setShuffledChainIndices] = useState<number[]>([]);

  const setupChain = useCallback((chainIndex: number) => {
    if (gameEvolutionChains.length === 0) return;

    const chain = gameEvolutionChains[chainIndex];
    const chainPokemon = chain.pokemon.map((p, idx) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      position: idx,
    }));

    const shuffled = shuffleArray(chainPokemon);
    setShuffledPokemon(shuffled);
    setSelectedOrder([]);
    setIsComplete(false);
    setWrongClick(null);
    setShowCelebration(false);
  }, [gameEvolutionChains]);

  useEffect(() => {
    if (gameEvolutionChains.length === 0) return;

    // Shuffle the chain indices at the start for random order
    const indices = Array.from({ length: gameEvolutionChains.length }, (_, i) => i);
    setShuffledChainIndices(shuffleArray(indices));
    setupChain(0);
  }, [gameEvolutionChains, setupChain]);

  const handlePokemonClick = (poke: EvolutionPokemon) => {
    if (isComplete) return;
    if (selectedOrder.includes(poke.id)) return;

    const expectedPosition = selectedOrder.length;

    if (poke.position === expectedPosition) {
      // Correct!
      const newOrder = [...selectedOrder, poke.id];
      setSelectedOrder(newOrder);

      // Announce the Pokemon name
      announcePokemon(poke.name);

      if (newOrder.length === 3) {
        // Chain complete!
        setIsComplete(true);
        setScore((s) => s + 1);
        setShowCelebration(true);

        // Play success sound and celebrate
        playSound("success");
        setTimeout(() => {
          celebrateWin();
        }, 500);
      } else {
        // Play levelup/powerup sound for correct selection (not complete yet)
        playSound("powerup");
        speak("Correct evolution!");
      }
    } else {
      // Wrong!
      playSound("error");
      setWrongClick(poke.id);
      setTimeout(() => setWrongClick(null), 500);
    }
  };

  const handleNextChain = () => {
    const nextIndex = (currentChainIndex + 1) % gameEvolutionChains.length;
    setCurrentChainIndex(nextIndex);
    setupChain(nextIndex);
  };

  const currentChain = gameEvolutionChains[currentChainIndex];

  // Get status for each pokemon
  const getPokemonStatus = (poke: EvolutionPokemon) => {
    if (selectedOrder.includes(poke.id)) return "correct";
    if (wrongClick === poke.id) return "wrong";
    return "pending";
  };

  // Get the correct ordered pokemon for the answer display
  const getOrderedPokemon = () => {
    if (!currentChain) return [];
    return currentChain.pokemon;
  };

  // Show loading state if chains aren't ready yet
  if (gameEvolutionChains.length === 0 || !currentChain) {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-purple-600 mb-2">
          Evolution Chain
        </h1>
        <p className="text-center text-xl text-gray-600">Loading evolution chains...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Title */}
      <h1 className="text-4xl font-bold text-center text-purple-600 mb-2">
        Evolution Chain
      </h1>
      <p className="text-center text-xl text-gray-600 mb-2">
        Click the Pokemon in the right order: Baby to Big!
      </p>
      <p className="text-center text-lg text-purple-500 mb-6">
        Go get them, {playerName}!
      </p>

      {/* Score and Progress */}
      <div className="flex justify-center gap-4 mb-8">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 rounded-full shadow-lg">
          <span className="text-white font-bold text-xl">
            Score: {score}
          </span>
        </div>
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-3 rounded-full shadow-lg">
          <span className="text-white font-bold text-xl">
            Chain {currentChainIndex + 1} / {gameEvolutionChains.length}
          </span>
        </div>
      </div>

      {/* Progress slots showing evolution order */}
      <div className="flex justify-center items-center gap-4 mb-8">
        {[0, 1, 2].map((slot, idx) => {
          const selectedId = selectedOrder[slot];
          const selectedPoke = selectedId
            ? shuffledPokemon.find((p) => p.id === selectedId)
            : null;

          return (
            <div key={slot} className="flex items-center">
              <div
                className={`w-28 h-28 rounded-2xl border-4 border-dashed flex items-center justify-center transition-all duration-300 ${
                  selectedPoke
                    ? "border-green-400 bg-green-100 scale-110 shadow-lg shadow-green-300"
                    : "border-gray-300 bg-gray-100"
                }`}
              >
                {selectedPoke ? (
                  <div className="text-center animate-bounce">
                    <Image
                      src={selectedPoke.image}
                      alt={selectedPoke.name}
                      width={80}
                      height={80}
                    />
                  </div>
                ) : (
                  <span className="text-4xl text-gray-400">?</span>
                )}
              </div>
              {idx < 2 && (
                <div className="mx-2 text-4xl text-purple-500 font-bold animate-pulse">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instruction */}
      <div className="text-center mb-6">
        <div className="inline-block bg-blue-100 px-6 py-3 rounded-full">
          <span className="text-blue-700 font-bold text-lg">
            {selectedOrder.length === 0 && "Click the FIRST Pokemon (the baby!)"}
            {selectedOrder.length === 1 && "Great! Now click the MIDDLE evolution!"}
            {selectedOrder.length === 2 && "Almost there! Click the FINAL evolution!"}
            {isComplete && "You did it!"}
          </span>
        </div>
      </div>

      {/* Pokemon choices */}
      <div className="flex justify-center gap-8 mb-8">
        {shuffledPokemon.map((poke) => {
          const status = getPokemonStatus(poke);

          return (
            <button
              key={poke.id}
              onClick={() => handlePokemonClick(poke)}
              disabled={status === "correct" || isComplete}
              className={`
                relative p-4 rounded-3xl transition-all duration-300 transform
                ${status === "correct"
                  ? "bg-green-200 scale-90 opacity-50 cursor-not-allowed ring-4 ring-green-400"
                  : status === "wrong"
                  ? "bg-red-200 animate-shake ring-4 ring-red-500"
                  : "bg-white hover:scale-110 hover:shadow-2xl shadow-lg cursor-pointer hover:bg-yellow-50"
                }
              `}
            >
              {status === "correct" && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl">
                  ✓
                </div>
              )}
              {status === "wrong" && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl">
                  ✗
                </div>
              )}
              <Image
                src={poke.image}
                alt={poke.name}
                width={140}
                height={140}
                className={status === "wrong" ? "animate-shake" : ""}
              />
              <p className="text-center font-bold text-lg mt-2 text-gray-700">
                {poke.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center animate-celebration pointer-events-auto">
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'][i % 6],
                  }}
                />
              ))}
            </div>

            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-8 rounded-3xl shadow-2xl transform animate-bounce-slow">
              <h2 className="text-5xl font-bold text-white mb-4">
                {getQuickPersonalizedMessage(playerName, "evolution_complete", { pokemonName: currentChain.name }).message} {getQuickPersonalizedMessage(playerName, "evolution_complete").emoji}
              </h2>
              <div className="flex justify-center items-center gap-2 mb-4">
                {getOrderedPokemon().map((p, idx) => (
                  <div key={p.id} className="flex items-center">
                    <div className="bg-white rounded-2xl p-2">
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={80}
                        height={80}
                      />
                    </div>
                    {idx < 2 && (
                      <span className="text-3xl text-white mx-2">→</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-2xl text-yellow-200 mb-4">
                {currentChain.name}
              </p>
              <button
                onClick={handleNextChain}
                className="bg-yellow-400 text-purple-700 px-8 py-4 rounded-full font-bold text-2xl hover:bg-yellow-300 transition-all hover:scale-110 shadow-lg"
              >
                Next Evolution Chain! →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        @keyframes celebration {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-celebration {
          animation: celebration 0.5s ease-out forwards;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        .confetti {
          position: absolute;
          width: 12px;
          height: 12px;
          animation: confetti-fall 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
