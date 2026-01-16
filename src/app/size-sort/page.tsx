"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon, getHeightInMeters } from "@/data/pokemon";

// Threshold: Pokemon >= 1.2m are BIG, < 1.2m are SMALL
const SIZE_THRESHOLD = 1.2;

// Celebration messages for milestones
const celebrationMessages = [
  "SUPER STAR!",
  "AMAZING!",
  "INCREDIBLE!",
  "FANTASTIC!",
  "WONDERFUL!",
  "AWESOME SAUCE!",
];

function formatHeight(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  }
  return `${meters.toFixed(1)} m`;
}

function getHeightComparison(meters: number): string {
  if (meters < 0.3) return "Tiny like a tennis ball!";
  if (meters < 0.5) return "Small like a cat!";
  if (meters < 1.0) return "About as tall as a dog!";
  if (meters < 1.5) return "As tall as a kid!";
  if (meters < 2.0) return "As tall as a grown-up!";
  if (meters < 3.0) return "Taller than a door!";
  if (meters < 5.0) return "As tall as a giraffe!";
  return "SUPER GIANT! Bigger than a house!";
}

export default function SizeSortPage() {
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");

  const getRandomPokemon = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * pokemon.length);
    return pokemon[randomIndex];
  }, []);

  const nextPokemon = useCallback(() => {
    setCurrentPokemon(getRandomPokemon());
    setAnswered(false);
    setIsCorrect(false);
    setShowCelebration(false);
  }, [getRandomPokemon]);

  useEffect(() => {
    nextPokemon();
  }, [nextPokemon]);

  const handleAnswer = (answer: "big" | "small") => {
    if (answered || !currentPokemon) return;

    const height = getHeightInMeters(currentPokemon);
    const actualSize = height >= SIZE_THRESHOLD ? "big" : "small";
    const correct = answer === actualSize;

    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      // Check for milestone celebration (every 5 correct)
      if (newStreak > 0 && newStreak % 5 === 0) {
        setShowCelebration(true);
        setCelebrationMessage(
          celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)]
        );
      }
    } else {
      setStreak(0);
    }
  };

  const height = currentPokemon ? getHeightInMeters(currentPokemon) : 1.0;
  const actualSize = height >= SIZE_THRESHOLD ? "BIG" : "SMALL";

  return (
    <div className="py-6 px-4 min-h-screen">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center text-purple-600 mb-4">
        Big or Small?
      </h1>

      {/* Streak Counter */}
      <div className="flex justify-center gap-4 mb-6">
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
      </div>

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
          {/* Confetti effect using CSS */}
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

      {currentPokemon && (
        <div className="max-w-xl mx-auto">
          {/* Pokemon Card */}
          <div
            className={`bg-white rounded-3xl p-6 mb-6 shadow-xl text-center transition-all duration-300 ${
              answered
                ? isCorrect
                  ? "ring-8 ring-green-400 scale-105"
                  : "ring-8 ring-red-400"
                : ""
            }`}
          >
            <div className="relative">
              <Image
                src={currentPokemon.image}
                alt={currentPokemon.name}
                width={200}
                height={200}
                className={`mx-auto transition-all duration-300 ${
                  answered && isCorrect ? "animate-bounce" : ""
                }`}
              />
              {answered && (
                <div
                  className={`absolute top-0 right-0 text-6xl ${
                    isCorrect ? "animate-spin-once" : "animate-shake"
                  }`}
                >
                  {isCorrect ? "✓" : "✗"}
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold mt-2">{currentPokemon.name}</h2>
            <p className="text-xl text-gray-500 mt-1">Is this Pokemon BIG or SMALL?</p>
          </div>

          {/* Answer Buttons */}
          {!answered && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleAnswer("big")}
                className="bg-green-500 hover:bg-green-600 text-white p-8 rounded-3xl font-bold text-3xl transition-all hover:scale-105 active:scale-95 shadow-xl flex flex-col items-center gap-2"
              >
                <span className="text-5xl">↑</span>
                BIG
              </button>
              <button
                onClick={() => handleAnswer("small")}
                className="bg-blue-500 hover:bg-blue-600 text-white p-8 rounded-3xl font-bold text-3xl transition-all hover:scale-105 active:scale-95 shadow-xl flex flex-col items-center gap-2"
              >
                <span className="text-5xl">↓</span>
                SMALL
              </button>
            </div>
          )}

          {/* Result Display */}
          {answered && (
            <div className="text-center">
              <div
                className={`text-3xl font-bold mb-4 ${
                  isCorrect ? "text-green-600" : "text-red-500"
                }`}
              >
                {isCorrect ? (
                  <>
                    YES! {currentPokemon.name} is {actualSize}!
                  </>
                ) : (
                  <>
                    Oops! {currentPokemon.name} is actually {actualSize}!
                  </>
                )}
              </div>

              {/* Height Info */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6">
                <div className="text-2xl font-bold text-purple-700 mb-1">
                  Height: {formatHeight(height)}
                </div>
                <div className="text-lg text-purple-600">
                  {getHeightComparison(height)}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={nextPokemon}
                className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-5 rounded-full font-bold text-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Next Pokemon!
              </button>
            </div>
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
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
        .animate-shake {
          animation: shake 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
