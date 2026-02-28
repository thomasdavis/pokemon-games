"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";

// Only use the first 150 Pokemon
const originalPokemon = pokemon.slice(0, 150);

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Calculate how similar two strings are (for "close" feedback)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

export default function PokemonTypingPage() {
  const [currentPokemon, setCurrentPokemon] = useState(originalPokemon[0]);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "close" | "hint" | "wrong" } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [gameQueue, setGameQueue] = useState<typeof originalPokemon>([]);
  const [pokemonSeen, setPokemonSeen] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize game queue
  useEffect(() => {
    const shuffled = shuffleArray(originalPokemon);
    setGameQueue(shuffled);
    setCurrentPokemon(shuffled[0]);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (!revealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [revealed, currentPokemon]);

  const getHint = useCallback(() => {
    const name = currentPokemon.name.toLowerCase();
    const unrevealedIndices: number[] = [];

    for (let i = 0; i < name.length; i++) {
      if (!revealedLetters.has(i) && /[a-z]/.test(name[i])) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length > 0) {
      const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
      setRevealedLetters(prev => new Set([...prev, randomIndex]));
      setHintsUsed(prev => prev + 1);
      setFeedback({ message: `Hint: Look at the highlighted letters!`, type: "hint" });
    }
  }, [currentPokemon.name, revealedLetters]);

  const renderNameWithHints = () => {
    const name = currentPokemon.name;
    return (
      <div className="flex justify-center gap-1 text-2xl font-mono mb-4">
        {name.split("").map((char, i) => {
          const isRevealed = revealedLetters.has(i);
          const isLetter = /[a-zA-Z]/.test(char);

          return (
            <span
              key={i}
              className={`w-8 h-10 flex items-center justify-center border-b-2 ${
                isRevealed
                  ? "border-green-500 text-green-600 font-bold bg-green-50"
                  : "border-gray-300"
              }`}
            >
              {isRevealed ? char.toUpperCase() : isLetter ? "_" : char}
            </span>
          );
        })}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (revealed || !guess.trim()) return;

    const normalizedGuess = guess.trim().toLowerCase();
    const correctAnswer = currentPokemon.name.toLowerCase();

    setAttempts(prev => prev + 1);

    if (normalizedGuess === correctAnswer) {
      // Correct!
      setRevealed(true);
      setScore(prev => prev + 1);
      setTotalAttempts(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      const messages = [
        "Amazing! You got it! 🎉",
        "Super! That's correct! ⭐",
        "Wow! You're a Pokemon Master! 🏆",
        "Perfect! Great spelling! ✨",
        "Yes! You nailed it! 🌟",
      ];
      setFeedback({
        message: attempts === 0
          ? "First try! Incredible! 🎯"
          : messages[Math.floor(Math.random() * messages.length)],
        type: "success"
      });
    } else {
      // Check how close they were
      const sim = similarity(normalizedGuess, correctAnswer);

      if (sim > 0.7) {
        // Very close - probably a typo
        setFeedback({
          message: "So close! Check your spelling and try again! 🤔",
          type: "close"
        });
      } else if (normalizedGuess[0] === correctAnswer[0]) {
        // Right first letter
        setFeedback({
          message: "Good start! The first letter is right! Keep going! 💪",
          type: "hint"
        });
      } else if (attempts >= 2) {
        // After 3 attempts, give more help
        setFeedback({
          message: `Try again! The name has ${correctAnswer.length} letters. Use the hint button! 💡`,
          type: "wrong"
        });
      } else {
        setFeedback({
          message: "Not quite! Look at the shape carefully and try again! 🔍",
          type: "wrong"
        });
      }
    }

    setGuess("");
  };

  const nextPokemon = () => {
    const newSeen = pokemonSeen + 1;
    setPokemonSeen(newSeen);

    if (newSeen < gameQueue.length) {
      setCurrentPokemon(gameQueue[newSeen]);
    } else {
      // Reshuffle when we've seen all Pokemon
      const shuffled = shuffleArray(originalPokemon);
      setGameQueue(shuffled);
      setCurrentPokemon(shuffled[0]);
      setPokemonSeen(0);
    }

    setGuess("");
    setRevealed(false);
    setAttempts(0);
    setFeedback(null);
    setHintsUsed(0);
    setRevealedLetters(new Set());
  };

  const skipPokemon = () => {
    setRevealed(true);
    setStreak(0);
    setTotalAttempts(prev => prev + 1);
    setFeedback({
      message: `It was ${currentPokemon.name}! You'll get the next one! 💪`,
      type: "wrong"
    });
  };

  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Who&apos;s That Pokemon? ⌨️
          </h1>
          <p className="text-gray-600">Type the Pokemon name and press Enter!</p>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-center">
          <div className="bg-white rounded-lg p-3 shadow">
            <div className="text-2xl font-bold text-green-600">{score}</div>
            <div className="text-xs text-gray-500">Correct</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow">
            <div className="text-2xl font-bold text-blue-600">{streak}</div>
            <div className="text-xs text-gray-500">Streak</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow">
            <div className="text-2xl font-bold text-purple-600">{bestStreak}</div>
            <div className="text-xs text-gray-500">Best</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow">
            <div className="text-2xl font-bold text-orange-600">{accuracy}%</div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
        </div>

        {/* Pokemon Display */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          {/* Pokemon Image */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Image
                src={currentPokemon.image}
                alt={revealed ? currentPokemon.name : "Mystery Pokemon"}
                width={200}
                height={200}
                className={`transition-all duration-500 ${
                  revealed
                    ? ""
                    : "brightness-0 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                }`}
                priority
              />
              {revealed && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold text-lg shadow-lg">
                  {currentPokemon.name}
                </div>
              )}
            </div>
          </div>

          {/* Name Hint Display */}
          {!revealed && renderNameWithHints()}

          {/* Pokemon Info (when revealed) */}
          {revealed && (
            <div className="text-center mb-4">
              <div className="flex justify-center gap-2 mt-4">
                {currentPokemon.types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{
                      backgroundColor: typeColors[type] || "#777",
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`text-center p-3 rounded-lg mb-4 text-lg font-medium ${
                feedback.type === "success"
                  ? "bg-green-100 text-green-700"
                  : feedback.type === "close"
                  ? "bg-yellow-100 text-yellow-700"
                  : feedback.type === "hint"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Input Form */}
          {!revealed ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type the Pokemon name..."
                  className="w-full text-center text-2xl p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!guess.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-xl transition-colors text-lg"
                >
                  Submit (Enter)
                </button>
                <button
                  type="button"
                  onClick={getHint}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                  title="Get a hint"
                >
                  💡 Hint
                </button>
              </div>

              <button
                type="button"
                onClick={skipPokemon}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-xl transition-colors"
              >
                I don&apos;t know - Show me! 🙈
              </button>
            </form>
          ) : (
            <button
              onClick={nextPokemon}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors text-xl"
              autoFocus
            >
              Next Pokemon →
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="bg-white/80 rounded-xl p-4 text-sm text-gray-600">
          <h3 className="font-bold text-gray-800 mb-2">Tips:</h3>
          <ul className="space-y-1">
            <li>• Look at the silhouette shape for clues</li>
            <li>• Count the blank spaces to know how many letters</li>
            <li>• Use the 💡 Hint button if you&apos;re stuck</li>
            <li>• Watch out for spelling - double letters are tricky!</li>
            <li>• Press Enter to submit your answer quickly</li>
          </ul>
        </div>

        {/* Progress */}
        <div className="mt-4 text-center text-gray-500 text-sm">
          Pokemon seen: {pokemonSeen + 1} / 150
        </div>
      </div>
    </div>
  );
}

const typeColors: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};
