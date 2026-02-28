"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon, getHeightInMeters } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Storage key for best streak
const BEST_STREAK_KEY = "height_duel_best_streak";

// Celebration messages for milestones
const celebrationMessages = [
  "HEIGHT MASTER!",
  "AMAZING!",
  "INCREDIBLE!",
  "FANTASTIC!",
  "WONDERFUL!",
  "SIZE GENIUS!",
];

function formatHeight(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  }
  return `${meters.toFixed(1)} m`;
}

function getHeightDescription(meters: number): string {
  if (meters < 0.3) return "Pocket-sized!";
  if (meters < 0.5) return "Tiny like a kitten!";
  if (meters < 1.0) return "About knee-high!";
  if (meters < 1.5) return "Child-sized!";
  if (meters < 2.0) return "Adult-sized!";
  if (meters < 4.0) return "Taller than a door!";
  if (meters < 8.0) return "Giraffe territory!";
  return "GIGANTIC!";
}

// Calculate difficulty based on height difference percentage
function getDifficulty(height1: number, height2: number): "easy" | "medium" | "hard" {
  const minHeight = Math.min(height1, height2);
  const maxHeight = Math.max(height1, height2);
  const percentDiff = ((maxHeight - minHeight) / minHeight) * 100;

  if (percentDiff > 50) return "easy";
  if (percentDiff > 20) return "medium";
  return "hard";
}

// Check if heights are within 10% of each other (close call)
function isCloseCall(height1: number, height2: number): boolean {
  const minHeight = Math.min(height1, height2);
  const maxHeight = Math.max(height1, height2);
  const percentDiff = ((maxHeight - minHeight) / minHeight) * 100;
  return percentDiff <= 10;
}

// Get two Pokemon based on difficulty (higher streak = harder)
function getTwoPokemon(streak: number): [Pokemon, Pokemon] {
  // Filter Pokemon with valid heights
  const validPokemon = pokemon.filter(p => p.height > 0);

  // For higher streaks, try to pick Pokemon with closer heights
  if (streak >= 5) {
    // Hard mode: pick Pokemon with heights within 30% of each other
    const attempts = 50;
    for (let i = 0; i < attempts; i++) {
      const idx1 = Math.floor(Math.random() * validPokemon.length);
      const pokemon1 = validPokemon[idx1];
      const height1 = getHeightInMeters(pokemon1);

      // Find Pokemon with similar height
      const similar = validPokemon.filter(p => {
        if (p.id === pokemon1.id) return false;
        const height2 = getHeightInMeters(p);
        const diff = Math.abs(height1 - height2) / Math.max(height1, height2);
        return diff < 0.3; // Within 30%
      });

      if (similar.length > 0) {
        const pokemon2 = similar[Math.floor(Math.random() * similar.length)];
        return Math.random() > 0.5 ? [pokemon1, pokemon2] : [pokemon2, pokemon1];
      }
    }
  }

  // Default: random selection
  let idx1 = Math.floor(Math.random() * validPokemon.length);
  let idx2 = Math.floor(Math.random() * validPokemon.length);

  // Make sure we don't pick the same Pokemon
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * validPokemon.length);
  }

  return [validPokemon[idx1], validPokemon[idx2]];
}

export default function HeightDuelPage() {
  const { name: playerName } = usePlayer();
  const [pokemon1, setPokemon1] = useState<Pokemon | null>(null);
  const [pokemon2, setPokemon2] = useState<Pokemon | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<1 | 2 | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [trickMode, setTrickMode] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<1 | 2 | null>(null);
  const [closeCallBonus, setCloseCallBonus] = useState(false);

  // Load best streak from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(BEST_STREAK_KEY);
      if (stored) {
        setBestStreak(parseInt(stored, 10));
      }
    }
  }, []);

  const nextRound = useCallback(() => {
    const [p1, p2] = getTwoPokemon(streak);
    setPokemon1(p1);
    setPokemon2(p2);
    setAnswered(false);
    setSelectedPokemon(null);
    setIsCorrect(false);
    setShowCelebration(false);
    setFeedbackMessage(null);
    setCloseCallBonus(false);
  }, [streak]);

  useEffect(() => {
    nextRound();
  }, []);

  const handleSelect = (selection: 1 | 2) => {
    if (answered || !pokemon1 || !pokemon2) return;

    // Play click sound
    playSound("click");

    const height1 = getHeightInMeters(pokemon1);
    const height2 = getHeightInMeters(pokemon2);

    // Determine which is taller
    const tallerIs = height1 > height2 ? 1 : height1 < height2 ? 2 : 0;

    // Handle tie (very rare)
    if (tallerIs === 0) {
      // Both same height - either answer is correct
      setAnswered(true);
      setSelectedPokemon(selection);
      setIsCorrect(true);
      speak("They're the same height! You win!");
      playSound("success");
      handleCorrect(height1, height2);
      return;
    }

    const correct = selection === tallerIs;
    setAnswered(true);
    setSelectedPokemon(selection);
    setIsCorrect(correct);

    if (correct) {
      handleCorrect(height1, height2);
    } else {
      handleIncorrect();
    }
  };

  const handleCorrect = (height1: number, height2: number) => {
    playSound("success");
    speak("Correct!");

    const closeCall = isCloseCall(height1, height2);
    setCloseCallBonus(closeCall);

    const newStreak = streak + 1;
    setStreak(newStreak);

    // Update best streak
    if (newStreak > bestStreak) {
      setBestStreak(newStreak);
      if (typeof window !== "undefined") {
        localStorage.setItem(BEST_STREAK_KEY, newStreak.toString());
      }
    }

    // Get personalized feedback message
    let feedback;
    if (closeCall) {
      feedback = { message: `Close call bonus, ${playerName}!`, emoji: "🎯" };
      playSound("combo");
    } else {
      feedback = getQuickPersonalizedMessage(playerName, "correct_answer");
    }
    setFeedbackMessage(feedback);

    // Check for milestone celebration (every 5 correct)
    if (newStreak > 0 && newStreak % 5 === 0) {
      setShowCelebration(true);
      setCelebrationMessage(
        celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)]
      );
      playSound("win");
      celebrateWin();
    } else if (newStreak >= 3 && newStreak % 3 === 0) {
      // Combo sound for streaks of 3
      playSound("combo");
      speak(`${newStreak} in a row!`);
    }
  };

  const handleIncorrect = () => {
    playSound("error");
    speak("Oops! Try again!");

    const feedback = getQuickPersonalizedMessage(playerName, "wrong_answer");
    setFeedbackMessage(feedback);

    setStreak(0);
  };

  const toggleTrickMode = () => {
    setTrickMode(!trickMode);
    playSound("click");
  };

  if (!pokemon1 || !pokemon2) {
    return (
      <div className="py-6 px-4 min-h-screen flex items-center justify-center">
        <div className="text-2xl text-purple-600 animate-pulse">Loading Pokemon...</div>
      </div>
    );
  }

  const height1 = getHeightInMeters(pokemon1);
  const height2 = getHeightInMeters(pokemon2);
  const difficulty = getDifficulty(height1, height2);
  const tallerPokemon = height1 >= height2 ? pokemon1 : pokemon2;
  const tallerHeight = Math.max(height1, height2);

  // Calculate sprite sizes for trick mode
  const BASE_SIZE = 180;
  const getDisplaySize = (height: number, pokemonNumber: 1 | 2) => {
    if (!trickMode) {
      // Normal mode: scale based on actual height (capped)
      const scale = Math.min(Math.max(height / 2, 0.5), 1.5);
      return Math.round(BASE_SIZE * scale);
    }
    // Trick mode: same size for both
    return BASE_SIZE;
  };

  return (
    <div className="py-6 px-4 min-h-screen">
      {/* Title and Player Name */}
      <h1 className="text-4xl md:text-5xl font-bold text-center text-purple-600 mb-2">
        Tall or Small: Height Duel
      </h1>
      <p className="text-center text-xl text-purple-400 mb-4">
        Playing as <span className="font-bold text-purple-600">{playerName}</span>
      </p>

      {/* Question */}
      <div className="text-center mb-4">
        <span className="text-2xl md:text-3xl font-bold text-gray-700">
          Which Pokemon is TALLER?
        </span>
      </div>

      {/* Streak Counter and Mode Toggle */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <div className="bg-white px-6 py-3 rounded-full shadow-lg">
          <span className="text-xl">
            Streak: <span className="font-bold text-orange-500">{streak}</span>
          </span>
        </div>
        {bestStreak > 0 && (
          <div className="bg-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-xl">
              Best: <span className="font-bold text-purple-500">{bestStreak}</span>
            </span>
          </div>
        )}
        <button
          onClick={toggleTrickMode}
          className={`px-6 py-3 rounded-full shadow-lg font-bold transition-all ${
            trickMode
              ? "bg-purple-500 text-white hover:bg-purple-600"
              : "bg-white text-purple-600 hover:bg-purple-50"
          }`}
        >
          {trickMode ? "Trick Mode ON" : "Trick Mode"}
        </button>
      </div>

      {/* Difficulty indicator */}
      {!answered && (
        <div className="text-center mb-4">
          <span className={`px-4 py-1 rounded-full text-sm font-medium ${
            difficulty === "easy" ? "bg-green-100 text-green-700" :
            difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          }`}>
            {difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard!"}
          </span>
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-bounce">
            <div className="text-6xl md:text-8xl font-bold text-yellow-400 drop-shadow-lg animate-pulse text-center">
              {celebrationMessage}
            </div>
            <div className="text-4xl md:text-6xl text-center mt-4">
              {streak} in a row!
            </div>
          </div>
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#f38181"][
                    i % 5
                  ],
                  width: "15px",
                  height: "15px",
                  borderRadius: Math.random() > 0.5 ? "50%" : "0",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pokemon Cards - Side by Side */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pokemon 1 Card */}
          <button
            onClick={() => handleSelect(1)}
            disabled={answered}
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`bg-white rounded-3xl p-6 shadow-xl text-center transition-all duration-300 ${
              !answered && "cursor-pointer hover:scale-105 hover:shadow-2xl"
            } ${
              !answered && hoveredCard === 1 && "ring-4 ring-blue-400 scale-105"
            } ${
              answered && selectedPokemon === 1
                ? isCorrect
                  ? "ring-8 ring-green-400 scale-105 bg-green-50"
                  : "ring-8 ring-red-400 bg-red-50"
                : ""
            } ${
              answered && selectedPokemon !== 1 && height1 >= height2
                ? "ring-4 ring-green-300"
                : ""
            }`}
          >
            <div className="relative flex items-center justify-center" style={{ minHeight: "200px" }}>
              <Image
                src={pokemon1.image}
                alt={pokemon1.name}
                width={getDisplaySize(height1, 1)}
                height={getDisplaySize(height1, 1)}
                className={`transition-all duration-300 ${
                  answered && height1 >= height2 ? "animate-bounce" : ""
                }`}
              />
              {answered && height1 >= height2 && (
                <div className="absolute top-0 right-0 text-5xl animate-spin-once">
                  👑
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-4">{pokemon1.name}</h2>

            {/* Height reveal after answer */}
            {answered && (
              <div className="mt-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-3">
                <div className="text-xl font-bold text-blue-700">
                  {formatHeight(height1)}
                </div>
                <div className="text-sm text-blue-600">
                  {getHeightDescription(height1)}
                </div>
              </div>
            )}
          </button>

          {/* VS Divider */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl shadow-lg">
              VS
            </div>
          </div>

          {/* Pokemon 2 Card */}
          <button
            onClick={() => handleSelect(2)}
            disabled={answered}
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`bg-white rounded-3xl p-6 shadow-xl text-center transition-all duration-300 ${
              !answered && "cursor-pointer hover:scale-105 hover:shadow-2xl"
            } ${
              !answered && hoveredCard === 2 && "ring-4 ring-pink-400 scale-105"
            } ${
              answered && selectedPokemon === 2
                ? isCorrect
                  ? "ring-8 ring-green-400 scale-105 bg-green-50"
                  : "ring-8 ring-red-400 bg-red-50"
                : ""
            } ${
              answered && selectedPokemon !== 2 && height2 >= height1
                ? "ring-4 ring-green-300"
                : ""
            }`}
          >
            <div className="relative flex items-center justify-center" style={{ minHeight: "200px" }}>
              <Image
                src={pokemon2.image}
                alt={pokemon2.name}
                width={getDisplaySize(height2, 2)}
                height={getDisplaySize(height2, 2)}
                className={`transition-all duration-300 ${
                  answered && height2 >= height1 ? "animate-bounce" : ""
                }`}
              />
              {answered && height2 >= height1 && (
                <div className="absolute top-0 right-0 text-5xl animate-spin-once">
                  👑
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-4">{pokemon2.name}</h2>

            {/* Height reveal after answer */}
            {answered && (
              <div className="mt-3 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-3">
                <div className="text-xl font-bold text-pink-700">
                  {formatHeight(height2)}
                </div>
                <div className="text-sm text-pink-600">
                  {getHeightDescription(height2)}
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Mobile VS indicator */}
        <div className="md:hidden text-center -mt-10 mb-4 relative z-10">
          <span className="bg-orange-500 text-white rounded-full px-6 py-2 font-bold text-xl shadow-lg">
            VS
          </span>
        </div>

        {/* Result Display */}
        {answered && (
          <div className="text-center mt-8">
            <div
              className={`text-3xl font-bold mb-2 ${
                isCorrect ? "text-green-600" : "text-red-500"
              }`}
            >
              {isCorrect ? (
                <>
                  YES! {tallerPokemon.name} is taller at {formatHeight(tallerHeight)}!
                </>
              ) : (
                <>
                  Oops! {tallerPokemon.name} is actually taller at {formatHeight(tallerHeight)}!
                </>
              )}
            </div>

            {/* Close call bonus indicator */}
            {closeCallBonus && isCorrect && (
              <div className="text-2xl text-yellow-600 font-bold mb-2 animate-pulse">
                Close Call Bonus! (+1 extra point)
              </div>
            )}

            {/* Personalized Feedback Message */}
            {feedbackMessage && (
              <div className={`text-2xl mb-4 ${isCorrect ? "text-green-500" : "text-orange-500"}`}>
                {feedbackMessage.emoji} {feedbackMessage.message}
              </div>
            )}

            {/* Height Comparison */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6 max-w-md mx-auto">
              <div className="text-lg text-purple-700">
                <span className="font-bold">{pokemon1.name}</span>: {formatHeight(height1)}
                <span className="mx-2">vs</span>
                <span className="font-bold">{pokemon2.name}</span>: {formatHeight(height2)}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                Difference: {formatHeight(Math.abs(height1 - height2))}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={nextRound}
              className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-5 rounded-full font-bold text-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              Next Duel!
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!answered && (
        <div className="text-center mt-6 text-gray-500">
          <p>Click on the Pokemon you think is TALLER!</p>
          {trickMode && (
            <p className="text-purple-600 font-medium mt-1">
              Trick Mode: Both Pokemon appear the same size!
            </p>
          )}
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes spin-once {
          0% {
            transform: rotate(0deg) scale(0);
          }
          50% {
            transform: rotate(180deg) scale(1.5);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        .animate-spin-once {
          animation: spin-once 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
