"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allGenerations } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, announcePokemon } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    description: "Obvious shapes",
    color: "bg-green-500",
    optionCount: 4,
    timeBonus: 50,
    baseScore: 10,
  },
  medium: {
    label: "Medium",
    description: "Similar Pokemon",
    color: "bg-yellow-500",
    optionCount: 5,
    timeBonus: 75,
    baseScore: 15,
  },
  hard: {
    label: "Hard",
    description: "Same body types",
    color: "bg-red-500",
    optionCount: 6,
    timeBonus: 100,
    baseScore: 20,
  },
};

// Group Pokemon by their shapes for harder difficulty
const pokemonByShape: Record<string, Pokemon[]> = {};
pokemon.forEach((p) => {
  const shape = p.shape || "unknown";
  if (!pokemonByShape[shape]) {
    pokemonByShape[shape] = [];
  }
  pokemonByShape[shape].push(p);
});

// Group Pokemon by generation for decoy selection
const pokemonByGeneration: Record<string, Pokemon[]> = {};
pokemon.forEach((p) => {
  if (!pokemonByGeneration[p.generation]) {
    pokemonByGeneration[p.generation] = [];
  }
  pokemonByGeneration[p.generation].push(p);
});

function getDecoys(
  correct: Pokemon,
  count: number,
  difficulty: Difficulty
): Pokemon[] {
  let pool: Pokemon[] = [];

  if (difficulty === "hard" && correct.shape) {
    // For hard mode, use Pokemon with the same shape
    pool = pokemonByShape[correct.shape]?.filter((p) => p.id !== correct.id) || [];
  } else if (difficulty === "medium") {
    // For medium mode, use Pokemon from the same generation
    pool = pokemonByGeneration[correct.generation]?.filter((p) => p.id !== correct.id) || [];
  }

  // If not enough Pokemon in pool, add from general pool
  if (pool.length < count) {
    const additionalPokemon = pokemon.filter(
      (p) => p.id !== correct.id && !pool.some((pp) => pp.id === p.id)
    );
    pool = [...pool, ...additionalPokemon];
  }

  // Shuffle and pick decoys
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function SilhouettePage() {
  const { name: playerName } = usePlayer();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [options, setOptions] = useState<Pokemon[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [personalizedMessage, setPersonalizedMessage] = useState<{
    message: string;
    emoji: string;
  } | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const hasSpokenRef = useRef(false);

  const generateRound = useCallback(() => {
    const randomPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const decoyCount = settings.optionCount - 1;
    const decoys = getDecoys(randomPokemon, decoyCount, difficulty);
    const allOptions = [randomPokemon, ...decoys].sort(() => Math.random() - 0.5);

    setCurrentPokemon(randomPokemon);
    setOptions(allOptions);
    setRevealed(false);
    setHintUsed(false);
    setIsCorrect(null);
    setMessage("");
    setPersonalizedMessage(null);
    setShowRevealAnimation(false);
    setRoundStartTime(Date.now());
    hasSpokenRef.current = false;

    // Announce the classic phrase
    setTimeout(() => {
      speak("Who's that Pokemon?", { rate: 1.0, pitch: 1.1 });
    }, 300);
  }, [difficulty]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleGuess = (guess: Pokemon) => {
    if (revealed) return;

    playSound("click");
    setShowRevealAnimation(true);

    // Play whoosh for reveal
    playSound("whoosh");

    // Delay the reveal slightly for animation
    setTimeout(() => {
      setRevealed(true);

      const settings = DIFFICULTY_SETTINGS[difficulty];
      const timeTaken = (Date.now() - roundStartTime) / 1000;
      const timeBonus = Math.max(0, Math.floor(settings.timeBonus - timeTaken * 2));
      const hintPenalty = hintUsed ? 0.5 : 1;

      if (guess.id === currentPokemon?.id) {
        setIsCorrect(true);
        const newStreak = streak + 1;
        const streakMultiplier = 1 + (newStreak - 1) * 0.1;
        const roundScore = Math.floor(
          (settings.baseScore + timeBonus) * streakMultiplier * hintPenalty
        );

        setScore((s) => s + roundScore);
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }

        setMessage(`Yes! It's ${currentPokemon.name}!`);
        playSound("success");

        // Announce the Pokemon after a brief delay
        if (!hasSpokenRef.current) {
          hasSpokenRef.current = true;
          setTimeout(() => {
            announcePokemon(currentPokemon.name);
          }, 500);
        }

        // Check for streak achievements
        if (newStreak >= 3 && newStreak % 3 === 0) {
          setTimeout(() => {
            playSound("win");
          }, 600);
          const streakMsg = getQuickPersonalizedMessage(playerName, "streak", {
            streak: newStreak,
          });
          setPersonalizedMessage(streakMsg);
        } else {
          const correctMsg = getQuickPersonalizedMessage(playerName, "correct_answer");
          setPersonalizedMessage(correctMsg);
        }
      } else {
        setIsCorrect(false);
        setStreak(0);
        setMessage(`Nope! It's ${currentPokemon?.name}!`);
        playSound("error");

        // Announce the correct Pokemon
        if (!hasSpokenRef.current) {
          hasSpokenRef.current = true;
          setTimeout(() => {
            speak(`It's ${currentPokemon?.name}!`, { rate: 0.9, pitch: 1.0 });
          }, 500);
        }

        const wrongMsg = getQuickPersonalizedMessage(playerName, "wrong_answer");
        setPersonalizedMessage(wrongMsg);
      }
    }, 400);
  };

  const handleHint = () => {
    if (revealed || hintUsed) return;

    playSound("whoosh");
    setHintUsed(true);

    speak("Here's a hint! The colors are revealed!", { rate: 1.0, pitch: 1.1 });
  };

  const handleNext = () => {
    setPersonalizedMessage(null);
    generateRound();
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    generateRound();
  };

  const settings = DIFFICULTY_SETTINGS[difficulty];

  return (
    <div className="py-8 min-h-screen">
      {/* Header */}
      <div className="text-center mb-4">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg font-semibold text-yellow-800 shadow">
          Player: {playerName}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-center text-purple-600 mb-2">
        PokeSilhouette
      </h1>
      <p className="text-center text-gray-600 mb-6 text-lg">Shadow Guess</p>

      {/* Difficulty Settings */}
      <div className="max-w-2xl mx-auto mb-6 bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-4 text-center">
          Difficulty
        </h2>
        <div className="flex justify-center gap-3">
          {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                resetGame();
              }}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
                difficulty === d
                  ? `${DIFFICULTY_SETTINGS[d].color} text-white scale-105 shadow-md`
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {DIFFICULTY_SETTINGS[d].label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          {settings.description} - {settings.optionCount} options
        </p>
      </div>

      {/* Score Display */}
      <div className="flex justify-center gap-6 text-lg mb-6 flex-wrap">
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Score: <span className="font-bold text-purple-600">{score}</span>
        </span>
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Streak:{" "}
          <span className="font-bold text-orange-500">{streak}</span> 🔥
        </span>
        <span className="bg-white px-5 py-2 rounded-full shadow">
          Best: <span className="font-bold text-blue-500">{bestStreak}</span> ⭐
        </span>
      </div>

      {currentPokemon && (
        <div className="max-w-2xl mx-auto px-4">
          {/* Silhouette Display */}
          <div
            className={`relative bg-gradient-to-b from-indigo-500 to-purple-700 rounded-3xl p-8 mb-6 shadow-xl overflow-hidden ${
              showRevealAnimation ? "animate-pulse" : ""
            }`}
          >
            {/* Question mark background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="text-9xl text-white font-bold flex items-center justify-center h-full">
                ?
              </div>
            </div>

            {/* Pokemon Image */}
            <div className="relative mx-auto w-64 h-64">
              <Image
                src={currentPokemon.image}
                alt=""
                fill
                className={`object-contain transition-all duration-700 ${
                  revealed
                    ? "brightness-100"
                    : hintUsed
                    ? "brightness-100 saturate-100 opacity-40"
                    : "brightness-0"
                }`}
                style={{
                  filter: revealed
                    ? "none"
                    : hintUsed
                    ? "brightness(1) saturate(1) opacity(0.4)"
                    : "brightness(0)",
                  transition: "filter 0.7s ease-out",
                }}
                priority
              />
            </div>

            {/* "Who's that Pokemon?" text */}
            {!revealed && (
              <div className="text-center mt-4">
                <span className="text-2xl font-bold text-white drop-shadow-lg">
                  Who&apos;s that Pokemon?
                </span>
              </div>
            )}
          </div>

          {/* Hint Button */}
          {!revealed && (
            <div className="text-center mb-6">
              <button
                onClick={handleHint}
                disabled={hintUsed}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  hintUsed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:scale-105 shadow-lg hover:shadow-xl"
                }`}
              >
                {hintUsed ? "Hint Used (Score Reduced)" : "🎨 Reveal Colors (Reduces Score)"}
              </button>
            </div>
          )}

          {/* Result Message */}
          {message && (
            <div
              className={`text-center text-3xl font-bold mb-4 ${
                isCorrect ? "text-green-600" : "text-red-500"
              } animate-bounce`}
            >
              {message}
            </div>
          )}

          {/* Personalized Message */}
          {personalizedMessage && (
            <div className="text-center text-xl mb-6">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-2 rounded-full shadow-md inline-block">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Options Grid */}
          <div
            className={`grid gap-3 ${
              settings.optionCount <= 4 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {options.map((option) => {
              let buttonStyle =
                "bg-white hover:bg-purple-50 hover:scale-102 shadow-lg border-4 border-transparent hover:border-purple-400";

              if (revealed) {
                if (option.id === currentPokemon.id) {
                  buttonStyle =
                    "bg-green-500 text-white scale-105 shadow-xl border-4 border-green-300";
                } else {
                  buttonStyle = "bg-gray-200 text-gray-400 border-4 border-transparent";
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleGuess(option)}
                  disabled={revealed}
                  className={`p-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${buttonStyle}`}
                >
                  {revealed && (
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src={option.image}
                        alt={option.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className={revealed && option.id !== currentPokemon.id ? "text-gray-400" : ""}>
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          {revealed && (
            <div className="text-center mt-8">
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-12 py-4 rounded-full font-bold text-2xl hover:from-purple-600 hover:to-indigo-700 transition-all hover:scale-105 shadow-lg"
              >
                Next Pokemon! →
              </button>
            </div>
          )}

          {/* Score breakdown on reveal */}
          {revealed && isCorrect && (
            <div className="text-center mt-4 text-gray-600">
              <span className="text-sm">
                {hintUsed && "(Half points - hint used) "}
                Streak multiplier: x{(1 + (streak - 1) * 0.1).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
