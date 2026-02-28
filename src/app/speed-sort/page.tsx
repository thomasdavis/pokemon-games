"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

interface SortablePokemon extends Pokemon {
  sortOrder: number;
}

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { speedRange: 50, label: "Easy" },
  medium: { speedRange: 30, label: "Medium" },
  hard: { speedRange: 15, label: "Hard" },
};

type Difficulty = keyof typeof DIFFICULTY_SETTINGS;

// Time bonus thresholds (in seconds)
const TIME_BONUSES = [
  { threshold: 10, bonus: 50 },
  { threshold: 20, bonus: 30 },
  { threshold: 30, bonus: 15 },
  { threshold: 60, bonus: 5 },
];

export default function SpeedSortPage() {
  const { name: playerName } = usePlayer();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [pokemonList, setPokemonList] = useState<SortablePokemon[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get 5 Pokemon with varied speeds based on difficulty
  const getRandomPokemon = useCallback((diff: Difficulty) => {
    const { speedRange } = DIFFICULTY_SETTINGS[diff];

    // Get a random base speed
    const baseSpeed = Math.floor(Math.random() * (150 - speedRange)) + 30;

    // Filter Pokemon within the speed range
    const eligible = pokemon.filter(
      (p) => p.speed >= baseSpeed && p.speed <= baseSpeed + speedRange
    );

    // If not enough Pokemon in range, widen the search
    let selected: Pokemon[];
    if (eligible.length >= 5) {
      selected = [...eligible].sort(() => Math.random() - 0.5).slice(0, 5);
    } else {
      // Fallback: just get 5 random Pokemon
      selected = [...pokemon].sort(() => Math.random() - 0.5).slice(0, 5);
    }

    // Shuffle the order and assign sortOrder
    const shuffled = selected.map((p, i) => ({
      ...p,
      sortOrder: i,
    }));

    // Shuffle the display order
    return shuffled.sort(() => Math.random() - 0.5);
  }, []);

  const startNewRound = useCallback(() => {
    const newPokemon = getRandomPokemon(difficulty);
    setPokemonList(newPokemon);
    setHasChecked(false);
    setResults([]);
    setScore(0);
    setHintUsed(false);
    setHintMessage(null);
    setFeedbackMessage(null);
    setStartTime(Date.now());
    setElapsedTime(0);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - Date.now()) / 1000));
    }, 100);
  }, [difficulty, getRandomPokemon]);

  // Update timer display
  useEffect(() => {
    if (!hasChecked && startTime > 0) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasChecked, startTime]);

  useEffect(() => {
    startNewRound();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startNewRound]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    playSound("click");
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the list
    const newList = [...pokemonList];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    setPokemonList(newList);
    setDraggedIndex(null);
    setDragOverIndex(null);
    playSound("pop");
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Check the order
  const checkOrder = () => {
    // Get correct order (sorted by speed, fastest first)
    const correctOrder = [...pokemonList].sort((a, b) => b.speed - a.speed);

    // Check each position
    const newResults = pokemonList.map((p, i) => p.id === correctOrder[i].id);
    setResults(newResults);
    setHasChecked(true);

    // Calculate score
    const correctCount = newResults.filter(Boolean).length;
    const isAllCorrect = correctCount === 5;

    // Calculate time bonus
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    let timeBonus = 0;
    for (const tb of TIME_BONUSES) {
      if (finalTime <= tb.threshold) {
        timeBonus = tb.bonus;
        break;
      }
    }

    // Base points: 20 per correct position
    const basePoints = correctCount * 20;

    // Bonus for all correct
    const perfectBonus = isAllCorrect ? 50 : 0;

    // Hint penalty
    const hintPenalty = hintUsed ? -10 : 0;

    const roundScore = Math.max(0, basePoints + perfectBonus + timeBonus + hintPenalty);
    setScore(roundScore);

    // Play sounds and speak
    if (isAllCorrect) {
      playSound("success");
      speak("Perfect! You sorted them all correctly!");
      const feedback = getQuickPersonalizedMessage(playerName, "won_game", { score: roundScore });
      setFeedbackMessage(feedback);
      setTotalScore((prev) => prev + roundScore);
    } else if (correctCount >= 3) {
      playSound("ding");
      speak(`Good job! You got ${correctCount} out of 5 correct.`);
      const feedback = getQuickPersonalizedMessage(playerName, "correct_answer");
      setFeedbackMessage(feedback);
      setTotalScore((prev) => prev + roundScore);
    } else {
      playSound("error");
      speak(`${correctCount} correct. Try again!`);
      const feedback = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setFeedbackMessage(feedback);
    }
  };

  // Give a hint
  const giveHint = () => {
    if (hintUsed) return;

    setHintUsed(true);
    playSound("click");

    // Find the first Pokemon that's out of place
    const correctOrder = [...pokemonList].sort((a, b) => b.speed - a.speed);

    for (let i = 0; i < pokemonList.length; i++) {
      if (pokemonList[i].id !== correctOrder[i].id) {
        const currentPos = i;
        const correctPos = pokemonList.findIndex((p) => p.id === correctOrder[i].id);
        const pokeName = correctOrder[i].name;

        if (correctPos > currentPos) {
          setHintMessage(`${pokeName} should move up!`);
          speak(`${pokeName} should move up!`);
        } else {
          setHintMessage(`${pokeName} should move down!`);
          speak(`${pokeName} should move down!`);
        }
        break;
      }
    }
  };

  // New round
  const handleNewRound = () => {
    setRound((r) => r + 1);
    startNewRound();
    playSound("click");
  };

  // Change difficulty
  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    setRound(1);
    setTotalScore(0);
    playSound("click");
  };

  return (
    <div className="py-6 px-4 min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-600 mb-2">
        Speed Sort
      </h1>
      <p className="text-center text-xl text-blue-400 mb-2">
        Drag to order by Speed - Fastest at top!
      </p>
      <p className="text-center text-lg text-purple-500 mb-4">
        Playing as <span className="font-bold">{playerName}</span>
      </p>

      {/* Stats Bar */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <div className="bg-white px-4 py-2 rounded-full shadow-lg">
          <span className="text-lg">
            Round: <span className="font-bold text-blue-600">{round}</span>
          </span>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-lg">
          <span className="text-lg">
            Total: <span className="font-bold text-purple-600">{totalScore}</span>
          </span>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-lg">
          <span className="text-lg">
            Time: <span className="font-bold text-orange-500">{elapsedTime}s</span>
          </span>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex justify-center gap-2 mb-6">
        {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => (
          <button
            key={diff}
            onClick={() => handleDifficultyChange(diff)}
            className={`px-4 py-2 rounded-full font-bold transition-all ${
              difficulty === diff
                ? "bg-blue-500 text-white scale-105"
                : "bg-white text-blue-500 hover:bg-blue-100"
            }`}
          >
            {DIFFICULTY_SETTINGS[diff].label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="text-center mb-4 text-gray-600">
        <p className="text-lg">Drag the cards to sort Pokemon from FASTEST to SLOWEST</p>
        <p className="text-4xl my-2">Fast at Top - Slow at Bottom</p>
      </div>

      {/* Pokemon Cards */}
      <div className="max-w-md mx-auto space-y-3 mb-6">
        {pokemonList.map((poke, index) => (
          <div
            key={poke.id}
            draggable={!hasChecked}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg cursor-grab active:cursor-grabbing
              transition-all duration-200
              ${draggedIndex === index ? "opacity-50 scale-95" : ""}
              ${dragOverIndex === index ? "ring-4 ring-blue-400 scale-102" : ""}
              ${hasChecked && results[index] ? "ring-4 ring-green-500 bg-green-50" : ""}
              ${hasChecked && !results[index] ? "ring-4 ring-red-500 bg-red-50" : ""}
              ${!hasChecked ? "hover:shadow-xl hover:scale-102" : ""}
            `}
            style={{ touchAction: "none" }}
          >
            {/* Position Number */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl
              ${hasChecked && results[index] ? "bg-green-500 text-white" : ""}
              ${hasChecked && !results[index] ? "bg-red-500 text-white" : ""}
              ${!hasChecked ? "bg-blue-100 text-blue-600" : ""}
            `}>
              {index + 1}
            </div>

            {/* Pokemon Image */}
            <div className="relative">
              <Image
                src={poke.image}
                alt={poke.name}
                width={80}
                height={80}
                className="rounded-xl"
                draggable={false}
              />
            </div>

            {/* Pokemon Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{poke.name}</h3>
              <div className="flex gap-1 mt-1">
                {poke.types.map((type) => (
                  <span
                    key={type}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getTypeColor(type)}`}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Speed Stat (hidden until checked) */}
            <div className={`
              text-right transition-all duration-300
              ${hasChecked ? "opacity-100" : "opacity-0"}
            `}>
              <div className="text-sm text-gray-500">Speed</div>
              <div className="text-2xl font-bold text-blue-600">{poke.speed}</div>
            </div>

            {/* Drag Handle */}
            {!hasChecked && (
              <div className="text-2xl text-gray-400">
                &#x2630;
              </div>
            )}

            {/* Result Icon */}
            {hasChecked && (
              <div className="text-3xl">
                {results[index] ? "&#10003;" : "&#10007;"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hint Message */}
      {hintMessage && !hasChecked && (
        <div className="text-center mb-4">
          <div className="inline-block bg-yellow-100 border-2 border-yellow-400 rounded-xl px-6 py-3">
            <span className="text-xl text-yellow-700 font-bold">
              Hint: {hintMessage}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!hasChecked ? (
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={giveHint}
            disabled={hintUsed}
            className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
              hintUsed
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 hover:scale-105"
            }`}
          >
            {hintUsed ? "Hint Used" : "Get Hint (-10 pts)"}
          </button>
          <button
            onClick={checkOrder}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg"
          >
            Check Order
          </button>
        </div>
      ) : (
        <div className="text-center mb-6">
          {/* Score Display */}
          <div className="bg-white rounded-2xl p-6 max-w-md mx-auto shadow-xl mb-4">
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Round Score</h3>
            <div className="text-5xl font-bold text-blue-600 mb-2">{score}</div>
            <div className="text-gray-500">
              {results.filter(Boolean).length}/5 correct
              {hintUsed && <span className="text-yellow-600"> (hint used)</span>}
            </div>
          </div>

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className="text-2xl mb-4 text-purple-600 font-bold">
              {feedbackMessage.emoji} {feedbackMessage.message}
            </div>
          )}

          {/* New Round Button */}
          <button
            onClick={handleNewRound}
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-lg"
          >
            New Round
          </button>
        </div>
      )}

      {/* Speed Legend */}
      <div className="text-center text-gray-500 text-sm mt-8">
        <p>Speed stat determines how fast a Pokemon moves in battle.</p>
        <p>Higher speed = attacks first!</p>
      </div>
    </div>
  );
}

// Helper function to get type colors
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    normal: "bg-gray-400",
    fire: "bg-red-500",
    water: "bg-blue-500",
    electric: "bg-yellow-400",
    grass: "bg-green-500",
    ice: "bg-cyan-400",
    fighting: "bg-orange-700",
    poison: "bg-purple-500",
    ground: "bg-amber-600",
    flying: "bg-indigo-400",
    psychic: "bg-pink-500",
    bug: "bg-lime-500",
    rock: "bg-stone-500",
    ghost: "bg-violet-600",
    dragon: "bg-indigo-600",
    dark: "bg-gray-700",
    steel: "bg-slate-400",
    fairy: "bg-pink-300",
  };
  return colors[type] || "bg-gray-400";
}
