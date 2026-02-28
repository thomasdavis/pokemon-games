"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { evolutionChains, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, celebrateWin, announcePokemon } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Difficulty settings
type Difficulty = "easy" | "medium" | "hard";

interface DifficultyConfig {
  label: string;
  description: string;
  chainLengths: number[];
  color: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    description: "2-stage chains",
    chainLengths: [2],
    color: "from-green-400 to-green-600",
  },
  medium: {
    label: "Medium",
    description: "3-stage chains",
    chainLengths: [3],
    color: "from-yellow-400 to-orange-500",
  },
  hard: {
    label: "Hard",
    description: "3+ stage chains (branching)",
    chainLengths: [3, 4, 5, 6, 7, 8, 9],
    color: "from-red-400 to-red-600",
  },
};

// Evolution Pokemon type for the game
interface EvolutionSlot {
  pokemon: Pokemon | null;
  correctPokemon: Pokemon;
  position: number;
}

// Shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get chains by difficulty
function getChainsByDifficulty(difficulty: Difficulty): Pokemon[][] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const chains: Pokemon[][] = [];

  evolutionChains.forEach((pokemonList) => {
    if (config.chainLengths.includes(pokemonList.length)) {
      chains.push([...pokemonList]);
    }
  });

  return chains;
}

export default function EvolutionOrderPage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [currentChain, setCurrentChain] = useState<Pokemon[]>([]);
  const [slots, setSlots] = useState<EvolutionSlot[]>([]);
  const [availablePokemon, setAvailablePokemon] = useState<Pokemon[]>([]);
  const [draggedPokemon, setDraggedPokemon] = useState<Pokemon | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [completionTime, setCompletionTime] = useState<number>(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [availableChains, setAvailableChains] = useState<Pokemon[][]>([]);
  const [chainIndex, setChainIndex] = useState(0);

  // Touch handling for mobile
  const [touchDraggedPokemon, setTouchDraggedPokemon] = useState<Pokemon | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Get available chains based on difficulty
  const chainsForDifficulty = useMemo(() => {
    if (!difficulty) return [];
    return shuffleArray(getChainsByDifficulty(difficulty));
  }, [difficulty]);

  // Initialize available chains when difficulty changes
  useEffect(() => {
    if (difficulty && chainsForDifficulty.length > 0) {
      setAvailableChains(chainsForDifficulty);
      setChainIndex(0);
    }
  }, [difficulty, chainsForDifficulty]);

  // Setup a new chain
  const setupChain = useCallback((chain: Pokemon[]) => {
    // Create slots with correct positions
    const newSlots: EvolutionSlot[] = chain.map((pokemon, idx) => ({
      pokemon: null,
      correctPokemon: pokemon,
      position: idx,
    }));

    // Shuffle the available pokemon
    const shuffledPokemon = shuffleArray([...chain]);

    setCurrentChain(chain);
    setSlots(newSlots);
    setAvailablePokemon(shuffledPokemon);
    setIsComplete(false);
    setIsCorrect(false);
    setAttempts(0);
    setStartTime(Date.now());
    setShowSparkles(false);
    setFeedbackMessage(null);

    // Announce start
    speak(`Order the ${chain[0].name} evolution chain!`);
  }, []);

  // Start game with selected difficulty
  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setStreak(0);
  };

  // Load next chain when chains are ready
  useEffect(() => {
    if (availableChains.length > 0 && chainIndex < availableChains.length) {
      setupChain(availableChains[chainIndex]);
    }
  }, [availableChains, chainIndex, setupChain]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, pokemon: Pokemon) => {
    setDraggedPokemon(pokemon);
    e.dataTransfer.effectAllowed = "move";
    playSound("click");
  };

  // Handle drag over slot
  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(slotIndex);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  // Handle drop on slot
  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedPokemon) return;

    // Check if slot already has a pokemon
    const currentSlot = slots[slotIndex];
    if (currentSlot.pokemon) {
      // Put the current pokemon back in available
      setAvailablePokemon((prev) => [...prev, currentSlot.pokemon!]);
    }

    // Place the dragged pokemon in the slot
    const newSlots = [...slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], pokemon: draggedPokemon };
    setSlots(newSlots);

    // Remove from available
    setAvailablePokemon((prev) => prev.filter((p) => p.id !== draggedPokemon.id));

    // Announce the pokemon
    announcePokemon(draggedPokemon.name);
    playSound("pop");

    setDraggedPokemon(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedPokemon(null);
    setDragOverSlot(null);
  };

  // Handle removing pokemon from slot (click to remove)
  const handleSlotClick = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.pokemon && !isComplete) {
      // Put the pokemon back in available
      setAvailablePokemon((prev) => [...prev, slot.pokemon!]);

      // Clear the slot
      const newSlots = [...slots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], pokemon: null };
      setSlots(newSlots);

      playSound("whoosh");
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent, pokemon: Pokemon) => {
    setTouchDraggedPokemon(pokemon);
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
    playSound("click");
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggedPokemon || !touchRef.current) return;

    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };

    // Find which slot we're over
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const slotElement = elements.find((el) => el.getAttribute("data-slot-index"));
    if (slotElement) {
      const index = parseInt(slotElement.getAttribute("data-slot-index") || "-1");
      setDragOverSlot(index);
    } else {
      setDragOverSlot(null);
    }
  };

  const handleTouchEnd = () => {
    if (touchDraggedPokemon && dragOverSlot !== null) {
      // Simulate drop
      const currentSlot = slots[dragOverSlot];
      if (currentSlot.pokemon) {
        setAvailablePokemon((prev) => [...prev, currentSlot.pokemon!]);
      }

      const newSlots = [...slots];
      newSlots[dragOverSlot] = { ...newSlots[dragOverSlot], pokemon: touchDraggedPokemon };
      setSlots(newSlots);

      setAvailablePokemon((prev) => prev.filter((p) => p.id !== touchDraggedPokemon.id));
      announcePokemon(touchDraggedPokemon.name);
      playSound("pop");
    }

    setTouchDraggedPokemon(null);
    setDragOverSlot(null);
    touchRef.current = null;
  };

  // Check if all slots are filled
  const allSlotsFilled = slots.every((slot) => slot.pokemon !== null);

  // Handle submit
  const handleSubmit = () => {
    setAttempts((prev) => prev + 1);

    // Check if order is correct
    const correct = slots.every((slot) => slot.pokemon?.id === slot.correctPokemon.id);
    setIsComplete(true);
    setIsCorrect(correct);
    setCompletionTime(Math.floor((Date.now() - startTime) / 1000));

    if (correct) {
      // Calculate score based on attempts and time
      const timeBonus = Math.max(0, 30 - completionTime);
      const attemptBonus = attempts === 0 ? 50 : Math.max(0, 30 - attempts * 10);
      const chainBonus = currentChain.length * 10;
      const roundScore = 100 + timeBonus + attemptBonus + chainBonus;

      setScore((prev) => prev + roundScore);
      const newStreak = streak + 1;
      setStreak(newStreak);

      // Play sounds and show celebration
      playSound("powerup");
      setShowSparkles(true);

      setTimeout(() => {
        celebrateWin();
        if (newStreak >= 3) {
          playSound("powerup");
        }
      }, 500);

      // Get personalized message
      const feedback = getQuickPersonalizedMessage(playerName, "evolution_complete", {
        pokemonName: currentChain[currentChain.length - 1].name,
      });
      setFeedbackMessage(feedback);
    } else {
      // Wrong order
      playSound("error");
      speak("Oops! That's not quite right. Try again!");
      setStreak(0);

      const feedback = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setFeedbackMessage(feedback);

      // Reset for retry
      setTimeout(() => {
        setIsComplete(false);
        setIsCorrect(false);
      }, 2000);
    }
  };

  // Handle next chain
  const handleNextChain = () => {
    const nextIndex = chainIndex + 1;
    if (nextIndex < availableChains.length) {
      setChainIndex(nextIndex);
    } else {
      // Reshuffle and start over
      setAvailableChains(shuffleArray(availableChains));
      setChainIndex(0);
    }
  };

  // Handle back to difficulty selection
  const handleBackToMenu = () => {
    setDifficulty(null);
    setCurrentChain([]);
    setSlots([]);
    setAvailablePokemon([]);
  };

  // Get family name for display
  const getFamilyName = () => {
    if (currentChain.length === 0) return "";
    return `${currentChain[0].name} Family`;
  };

  // Difficulty selection screen
  if (!difficulty) {
    return (
      <div className="py-8 px-4 min-h-screen">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-purple-600 mb-2">
          Evolution Order
        </h1>
        <p className="text-center text-xl text-gray-600 mb-2">
          Chain Builder
        </p>
        <p className="text-center text-lg text-purple-500 mb-8">
          Drag Pokemon into the correct evolution order!
        </p>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-700">
            Choose Difficulty, {playerName}!
          </h2>

          <div className="grid gap-4">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => {
              const config = DIFFICULTY_CONFIG[diff];
              const chainsCount = getChainsByDifficulty(diff).length;

              return (
                <button
                  key={diff}
                  onClick={() => startGame(diff)}
                  className={`bg-gradient-to-r ${config.color} p-6 rounded-2xl text-white shadow-xl hover:scale-105 transition-all duration-300 text-left`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold">{config.label}</h3>
                      <p className="text-white/90">{config.description}</p>
                      <p className="text-sm text-white/70 mt-1">{chainsCount} chains available</p>
                    </div>
                    <div className="text-5xl opacity-50">
                      {diff === "easy" && "1"}
                      {diff === "medium" && "2"}
                      {diff === "hard" && "3+"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (currentChain.length === 0) {
    return (
      <div className="py-8 px-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">...</div>
          <p className="text-xl text-gray-600">Loading evolution chains...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleBackToMenu}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-full text-gray-700 font-bold transition-all"
        >
          Back
        </button>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-purple-600">
            Evolution Order
          </h1>
          <p className="text-sm text-purple-400">
            {DIFFICULTY_CONFIG[difficulty].label} Mode
          </p>
        </div>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Player name */}
      <p className="text-center text-lg text-purple-500 mb-4">
        Go, {playerName}!
      </p>

      {/* Score and Stats */}
      <div className="flex justify-center gap-3 mb-6 flex-wrap">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 rounded-full shadow-lg">
          <span className="text-white font-bold">Score: {score}</span>
        </div>
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-2 rounded-full shadow-lg">
          <span className="text-white font-bold">Streak: {streak}</span>
        </div>
        <div className="bg-gradient-to-r from-blue-400 to-cyan-400 px-4 py-2 rounded-full shadow-lg">
          <span className="text-white font-bold">
            Chain {(chainIndex % availableChains.length) + 1}/{availableChains.length}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center mb-6">
        <div className="inline-block bg-blue-100 px-6 py-3 rounded-full">
          <span className="text-blue-700 font-bold text-lg">
            Drag Pokemon into the correct evolution order: First to Last!
          </span>
        </div>
      </div>

      {/* Evolution Slots */}
      <div className="flex justify-center items-center gap-2 md:gap-4 mb-8 flex-wrap">
        {slots.map((slot, idx) => (
          <div key={idx} className="flex items-center">
            <div
              data-slot-index={idx}
              onClick={() => handleSlotClick(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`
                w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-dashed
                flex flex-col items-center justify-center
                transition-all duration-300 cursor-pointer
                ${
                  slot.pokemon
                    ? isComplete && isCorrect
                      ? "border-green-400 bg-green-100 shadow-lg shadow-green-300"
                      : isComplete && !isCorrect
                      ? slot.pokemon.id === slot.correctPokemon.id
                        ? "border-green-400 bg-green-100"
                        : "border-red-400 bg-red-100"
                      : "border-purple-400 bg-purple-100 hover:bg-purple-200"
                    : dragOverSlot === idx
                    ? "border-yellow-400 bg-yellow-100 scale-110"
                    : "border-gray-300 bg-gray-100 hover:border-purple-300 hover:bg-purple-50"
                }
              `}
            >
              {slot.pokemon ? (
                <div className={`text-center ${isComplete && isCorrect ? "animate-bounce" : ""}`}>
                  <Image
                    src={slot.pokemon.image}
                    alt={slot.pokemon.name}
                    width={64}
                    height={64}
                    className="md:w-20 md:h-20"
                  />
                  <p className="text-xs md:text-sm font-bold text-gray-700 truncate max-w-[80px] md:max-w-[100px]">
                    {slot.pokemon.name}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-3xl md:text-4xl text-gray-400">?</span>
                  <p className="text-xs text-gray-400">Slot {idx + 1}</p>
                </div>
              )}
            </div>
            {idx < slots.length - 1 && (
              <div className="mx-1 md:mx-2 text-2xl md:text-4xl text-purple-500 font-bold animate-pulse">
                {">"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Available Pokemon to Drag */}
      {!isComplete && availablePokemon.length > 0 && (
        <div className="mb-6">
          <p className="text-center text-gray-600 mb-3 font-bold">
            Drag these Pokemon to the slots above:
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            {availablePokemon.map((pokemon) => (
              <div
                key={pokemon.id}
                draggable
                onDragStart={(e) => handleDragStart(e, pokemon)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, pokemon)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`
                  bg-white p-3 md:p-4 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing
                  transition-all duration-300 hover:scale-110 hover:shadow-xl
                  ${draggedPokemon?.id === pokemon.id || touchDraggedPokemon?.id === pokemon.id ? "opacity-50 scale-95" : ""}
                `}
              >
                <Image
                  src={pokemon.image}
                  alt={pokemon.name}
                  width={80}
                  height={80}
                  className="md:w-24 md:h-24 pointer-events-none"
                />
                <p className="text-center font-bold text-gray-700 mt-1 text-sm md:text-base">
                  {pokemon.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {!isComplete && allSlotsFilled && (
        <div className="text-center mb-6">
          <button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white px-10 py-4 rounded-full font-bold text-xl hover:scale-105 transition-all shadow-xl"
          >
            Check Order!
          </button>
        </div>
      )}

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`text-center mb-4 text-2xl ${isCorrect ? "text-green-600" : "text-orange-500"}`}>
          {feedbackMessage.emoji} {feedbackMessage.message}
        </div>
      )}

      {/* Success Overlay */}
      {isComplete && isCorrect && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          {/* Sparkle particles */}
          {showSparkles && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className="sparkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-6 md:p-8 rounded-3xl shadow-2xl transform animate-celebration pointer-events-auto max-w-lg mx-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Evolution Complete!
            </h2>

            {/* Show the correct chain */}
            <div className="flex justify-center items-center gap-1 md:gap-2 mb-4 flex-wrap">
              {currentChain.map((p, idx) => (
                <div key={p.id} className="flex items-center">
                  <div className="bg-white rounded-xl p-1 md:p-2">
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={50}
                      height={50}
                      className="md:w-16 md:h-16"
                    />
                  </div>
                  {idx < currentChain.length - 1 && (
                    <span className="text-xl md:text-2xl text-white mx-1">{">"}</span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xl md:text-2xl text-yellow-200 mb-2 text-center">
              {getFamilyName()}
            </p>

            <div className="text-center text-white mb-4">
              <p className="text-lg">Time: {completionTime}s | Attempts: {attempts + 1}</p>
              {streak >= 3 && (
                <p className="text-xl font-bold text-yellow-300 animate-pulse">
                  {streak} Streak Bonus!
                </p>
              )}
            </div>

            <button
              onClick={handleNextChain}
              className="w-full bg-yellow-400 text-purple-700 px-6 py-4 rounded-full font-bold text-xl hover:bg-yellow-300 transition-all hover:scale-105 shadow-lg"
            >
              Next Evolution Chain!
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes sparkle {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
          }
        }

        .sparkle {
          position: absolute;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #fff 0%, #ffd700 50%, transparent 100%);
          border-radius: 50%;
          animation: sparkle 2s ease-out forwards;
        }

        .sparkle::before,
        .sparkle::after {
          content: "";
          position: absolute;
          background: inherit;
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .sparkle::before {
          transform: rotate(45deg);
        }

        .sparkle::after {
          transform: rotate(-45deg);
        }

        @keyframes celebration {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .animate-celebration {
          animation: celebration 0.6s ease-out forwards;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
