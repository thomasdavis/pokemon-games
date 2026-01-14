"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";

// Pokemon heights in meters (approximate real heights from the games)
// Heights >= 1.0m are considered "BIG", < 1.0m are "SMALL"
const pokemonHeights: Record<number, number> = {
  // Tiny Pokemon (under 0.5m)
  10: 0.3,  // Caterpie
  11: 0.7,  // Metapod
  13: 0.3,  // Weedle
  14: 0.6,  // Kakuna
  16: 0.3,  // Pidgey
  19: 0.3,  // Rattata
  21: 0.3,  // Spearow
  25: 0.4,  // Pikachu
  27: 0.6,  // Sandshrew
  29: 0.4,  // Nidoran F
  32: 0.5,  // Nidoran M
  35: 0.6,  // Clefairy
  37: 0.6,  // Vulpix
  39: 0.5,  // Jigglypuff
  41: 0.8,  // Zubat
  43: 0.5,  // Oddish
  46: 0.3,  // Paras
  48: 1.0,  // Venonat
  50: 0.2,  // Diglett
  52: 0.4,  // Meowth
  54: 0.8,  // Psyduck
  56: 0.5,  // Mankey
  58: 0.7,  // Growlithe
  60: 0.6,  // Poliwag
  63: 0.9,  // Abra
  66: 0.8,  // Machop
  69: 0.7,  // Bellsprout
  72: 0.9,  // Tentacool
  74: 0.4,  // Geodude
  77: 1.0,  // Ponyta
  79: 1.2,  // Slowpoke
  81: 0.3,  // Magnemite
  83: 0.8,  // Farfetch'd
  86: 1.1,  // Seel
  88: 0.9,  // Grimer
  90: 0.3,  // Shellder
  92: 1.3,  // Gastly
  96: 1.0,  // Drowzee
  98: 0.4,  // Krabby
  100: 0.5, // Voltorb
  102: 0.4, // Exeggcute
  104: 0.4, // Cubone
  109: 0.6, // Koffing
  116: 0.4, // Horsea
  118: 0.6, // Goldeen
  120: 0.8, // Staryu
  129: 0.9, // Magikarp
  132: 0.3, // Ditto
  133: 0.3, // Eevee
  137: 0.8, // Porygon
  138: 0.4, // Omanyte
  140: 0.5, // Kabuto
  147: 1.8, // Dratini

  // Small-Medium Pokemon (0.5m - 1.0m)
  1: 0.7,   // Bulbasaur
  4: 0.6,   // Charmander
  7: 0.5,   // Squirtle
  23: 2.0,  // Ekans
  40: 1.0,  // Wigglytuff
  44: 0.8,  // Gloom

  // Medium Pokemon (1.0m - 1.5m)
  2: 1.0,   // Ivysaur
  5: 1.1,   // Charmeleon
  8: 1.0,   // Wartortle
  12: 1.1,  // Butterfree
  15: 1.0,  // Beedrill
  17: 1.1,  // Pidgeotto
  20: 0.7,  // Raticate
  26: 0.8,  // Raichu
  28: 1.0,  // Sandslash
  30: 0.8,  // Nidorina
  33: 0.9,  // Nidorino
  36: 1.3,  // Clefable
  38: 1.1,  // Ninetales
  42: 1.6,  // Golbat
  45: 1.2,  // Vileplume
  47: 1.0,  // Parasect
  49: 1.5,  // Venomoth
  51: 0.7,  // Dugtrio
  53: 1.0,  // Persian
  55: 1.7,  // Golduck
  57: 1.0,  // Primeape
  61: 1.0,  // Poliwhirl
  64: 1.3,  // Kadabra
  67: 1.5,  // Machoke
  70: 1.0,  // Weepinbell
  75: 1.0,  // Graveler
  80: 1.6,  // Slowbro
  82: 1.0,  // Magneton
  84: 1.4,  // Doduo
  87: 1.7,  // Dewgong
  89: 1.2,  // Muk
  91: 1.5,  // Cloyster
  93: 1.6,  // Haunter
  94: 1.5,  // Gengar
  97: 1.6,  // Hypno
  99: 1.3,  // Kingler
  101: 1.2, // Electrode
  105: 1.0, // Marowak
  106: 1.5, // Hitmonlee
  107: 1.4, // Hitmonchan
  108: 1.2, // Lickitung
  110: 1.2, // Weezing
  113: 1.1, // Chansey
  114: 1.0, // Tangela
  117: 1.2, // Seadra
  119: 1.3, // Seaking
  121: 1.1, // Starmie
  122: 1.3, // Mr. Mime
  124: 1.4, // Jynx
  127: 1.5, // Pinsir
  134: 1.0, // Vaporeon
  135: 0.8, // Jolteon
  136: 0.9, // Flareon
  139: 1.0, // Omastar

  // Large Pokemon (1.5m - 2.0m)
  3: 2.0,   // Venusaur
  6: 1.7,   // Charizard
  9: 1.6,   // Blastoise
  18: 1.5,  // Pidgeot
  22: 1.2,  // Fearow
  24: 3.5,  // Arbok
  31: 1.3,  // Nidoqueen
  34: 1.4,  // Nidoking
  59: 1.9,  // Arcanine
  62: 1.3,  // Poliwrath
  65: 1.5,  // Alakazam
  68: 1.6,  // Machamp
  71: 1.7,  // Victreebel
  73: 1.6,  // Tentacruel
  76: 1.4,  // Golem
  78: 1.7,  // Rapidash
  103: 2.0, // Exeggutor
  111: 1.0, // Rhyhorn
  112: 1.9, // Rhydon
  115: 2.2, // Kangaskhan
  123: 1.5, // Scyther
  125: 1.1, // Electabuzz
  126: 1.3, // Magmar
  128: 1.4, // Tauros
  141: 1.3, // Kabutops
  142: 1.8, // Aerodactyl
  148: 4.0, // Dragonair
  150: 2.0, // Mewtwo

  // Giant Pokemon (over 2.0m)
  95: 8.8,  // Onix - HUGE!
  130: 6.5, // Gyarados - HUGE!
  131: 2.5, // Lapras
  143: 2.1, // Snorlax
  144: 1.7, // Articuno
  145: 1.6, // Zapdos
  146: 2.0, // Moltres
  149: 2.2, // Dragonite
};

// Threshold: Pokemon >= 1.2m are BIG, < 1.2m are SMALL
const SIZE_THRESHOLD = 1.2;

// Get a subset of Pokemon that have clear size data for better gameplay
const gamePokemon = pokemon.filter((p) => pokemonHeights[p.id] !== undefined);

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
    const randomIndex = Math.floor(Math.random() * gamePokemon.length);
    return gamePokemon[randomIndex];
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

    const height = pokemonHeights[currentPokemon.id] || 1.0;
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

  const height = currentPokemon ? pokemonHeights[currentPokemon.id] || 1.0 : 1.0;
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
