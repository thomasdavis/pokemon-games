"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { pokemon, Pokemon, getWeightInKg } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Streak titles based on consecutive correct answers
const STREAK_TITLES: Record<number, { title: string; emoji: string }> = {
  3: { title: "Rookie Weigher", emoji: "🌟" },
  5: { title: "Scale Expert", emoji: "⚖️" },
  10: { title: "Weight Master", emoji: "🏅" },
  20: { title: "Champion of Scales", emoji: "👑" },
};

// Get title for current streak
function getStreakTitle(streak: number): { title: string; emoji: string } | null {
  const thresholds = [20, 10, 5, 3];
  for (const threshold of thresholds) {
    if (streak >= threshold) {
      return STREAK_TITLES[threshold];
    }
  }
  return null;
}

// localStorage key for best streak
const BEST_STREAK_KEY = "poke_scale_best_streak";

// Custom hook to get a random pair of Pokemon with optional difficulty constraints
function useRandomPair(options?: { minPercentDiff?: number; maxPercentDiff?: number }) {
  const getRandomPair = useCallback(() => {
    const { minPercentDiff = 0, maxPercentDiff = 100 } = options || {};

    // Try to find a suitable pair (max 50 attempts)
    for (let attempt = 0; attempt < 50; attempt++) {
      const index1 = Math.floor(Math.random() * pokemon.length);
      let index2 = Math.floor(Math.random() * pokemon.length);

      // Ensure different Pokemon
      while (index2 === index1) {
        index2 = Math.floor(Math.random() * pokemon.length);
      }

      const p1 = pokemon[index1];
      const p2 = pokemon[index2];

      // Calculate percent difference
      const weight1 = getWeightInKg(p1);
      const weight2 = getWeightInKg(p2);
      const maxWeight = Math.max(weight1, weight2);
      const minWeight = Math.min(weight1, weight2);
      const percentDiff = maxWeight > 0 ? ((maxWeight - minWeight) / maxWeight) * 100 : 0;

      // Check if within difficulty constraints
      if (percentDiff >= minPercentDiff && percentDiff <= maxPercentDiff) {
        return [p1, p2] as [Pokemon, Pokemon];
      }
    }

    // Fallback: just return any two different Pokemon
    const index1 = Math.floor(Math.random() * pokemon.length);
    let index2 = Math.floor(Math.random() * pokemon.length);
    while (index2 === index1) {
      index2 = Math.floor(Math.random() * pokemon.length);
    }
    return [pokemon[index1], pokemon[index2]] as [Pokemon, Pokemon];
  }, [options]);

  return { getRandomPair };
}

// Format weight nicely
function formatWeight(kg: number): string {
  if (kg < 1) {
    return `${(kg * 1000).toFixed(0)} g`;
  }
  if (kg >= 100) {
    return `${kg.toFixed(0)} kg`;
  }
  return `${kg.toFixed(1)} kg`;
}

// Get a fun weight comparison
function getWeightComparison(kg: number): string {
  if (kg < 1) return "Light as a feather!";
  if (kg < 5) return "About as heavy as a cat!";
  if (kg < 20) return "Like a medium-sized dog!";
  if (kg < 50) return "Heavy as a big suitcase!";
  if (kg < 100) return "As heavy as a person!";
  if (kg < 300) return "Like a big motorcycle!";
  if (kg < 500) return "Heavy as a grand piano!";
  if (kg < 1000) return "Like a small car!";
  return "SUPER HEAVY! Like an elephant!";
}

export default function PokeScalePage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [pair, setPair] = useState<[Pokemon, Pokemon] | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newTitle, setNewTitle] = useState<{ title: string; emoji: string } | null>(null);

  // Determine if this is a "boss round" (weights within 10%)
  const isBossRound = useMemo(() => {
    if (!pair) return false;
    const w1 = getWeightInKg(pair[0]);
    const w2 = getWeightInKg(pair[1]);
    const maxW = Math.max(w1, w2);
    const minW = Math.min(w1, w2);
    const percentDiff = maxW > 0 ? ((maxW - minW) / maxW) * 100 : 0;
    return percentDiff < 10;
  }, [pair]);

  // Use the custom hook for random pairs
  // As streak increases, we increase difficulty by narrowing the weight difference
  const difficultyOptions = useMemo(() => {
    if (streak >= 15) return { maxPercentDiff: 15 }; // Very hard
    if (streak >= 10) return { maxPercentDiff: 25 }; // Hard
    if (streak >= 5) return { maxPercentDiff: 40 }; // Medium
    return undefined; // Easy - any difference
  }, [streak]);

  const { getRandomPair } = useRandomPair(difficultyOptions);

  // Load best streak from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(BEST_STREAK_KEY);
      if (saved) {
        setBestStreak(parseInt(saved, 10));
      }
    }
  }, []);

  // Save best streak to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && bestStreak > 0) {
      localStorage.setItem(BEST_STREAK_KEY, bestStreak.toString());
    }
  }, [bestStreak]);

  // Get next pair
  const nextRound = useCallback(() => {
    setPair(getRandomPair());
    setAnswered(false);
    setSelectedIndex(null);
    setIsCorrect(false);
    setFeedbackMessage(null);
    setShowLevelUp(false);
    setNewTitle(null);
  }, [getRandomPair]);

  // Initialize first round
  useEffect(() => {
    nextRound();
  }, [nextRound]);

  // Handle player selection
  const handleSelect = (index: number) => {
    if (answered || !pair) return;

    playSound("click");
    setSelectedIndex(index);
    setAnswered(true);

    const weight0 = getWeightInKg(pair[0]);
    const weight1 = getWeightInKg(pair[1]);
    const heavierIndex = weight0 >= weight1 ? 0 : 1;
    const correct = index === heavierIndex;

    setIsCorrect(correct);

    if (correct) {
      playSound("success");

      const newStreak = streak + 1;
      setStreak(newStreak);

      // Check for new title
      const previousTitle = getStreakTitle(streak);
      const currentTitle = getStreakTitle(newStreak);

      if (currentTitle && (!previousTitle || currentTitle.title !== previousTitle.title)) {
        // New title achieved!
        setShowLevelUp(true);
        setNewTitle(currentTitle);
        playSound("powerup");
        speak(`Congratulations! You are now a ${currentTitle.title}!`);
      } else {
        // Regular correct answer
        const winner = pair[index];
        speak(`${winner.name} is heavier!`);
      }

      // Update best streak
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      // Get personalized feedback
      const feedback = getQuickPersonalizedMessage(playerName, newStreak % 5 === 0 ? "streak" : "correct_answer", { streak: newStreak });
      setFeedbackMessage(feedback);
    } else {
      playSound("error");
      speak("Oops! That one was lighter!");

      // Reset streak
      setStreak(0);

      // Get personalized feedback
      const feedback = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setFeedbackMessage(feedback);
    }
  };

  // Calculate weight info for display
  const weightInfo = useMemo(() => {
    if (!pair) return null;
    const w0 = getWeightInKg(pair[0]);
    const w1 = getWeightInKg(pair[1]);
    const maxW = Math.max(w0, w1);
    const minW = Math.min(w0, w1);
    const diff = maxW - minW;
    const percentDiff = maxW > 0 ? ((diff / maxW) * 100).toFixed(1) : "0";
    return { w0, w1, diff, percentDiff };
  }, [pair]);

  // Current title
  const currentTitle = getStreakTitle(streak);

  if (!pair) return null;

  return (
    <div className="py-6 px-4 min-h-screen">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
        PokeScale: Heavy or Light?
      </h1>
      <p className="text-center text-lg text-purple-400 mb-4">
        Which Pokemon weighs more?
      </p>

      {/* Player info and streak */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <div className="bg-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span className="font-bold text-purple-600">{playerName}</span>
        </div>
        <div className="bg-gradient-to-r from-orange-400 to-red-500 px-5 py-2 rounded-full shadow-lg text-white">
          <span className="font-bold">Streak: {streak}</span>
        </div>
        {bestStreak > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-2 rounded-full shadow-lg text-white">
            <span className="font-bold">Best: {bestStreak}</span>
          </div>
        )}
        {currentTitle && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2 rounded-full shadow-lg text-white flex items-center gap-2">
            <span>{currentTitle.emoji}</span>
            <span className="font-bold">{currentTitle.title}</span>
          </div>
        )}
      </div>

      {/* Boss Round Indicator */}
      {isBossRound && !answered && (
        <div className="max-w-xl mx-auto mb-4">
          <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center py-3 px-6 rounded-2xl shadow-lg animate-pulse">
            <span className="text-2xl mr-2">🔥</span>
            <span className="font-bold text-xl">BOSS ROUND!</span>
            <span className="text-2xl ml-2">🔥</span>
            <p className="text-sm mt-1 opacity-90">These Pokemon have very similar weights!</p>
          </div>
        </div>
      )}

      {/* Pokemon Cards */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {pair.map((p, index) => {
            const weight = getWeightInKg(p);
            const isSelected = selectedIndex === index;
            const isHeavier = answered && weightInfo && (index === 0 ? weightInfo.w0 >= weightInfo.w1 : weightInfo.w1 > weightInfo.w0);

            let cardStyle = "bg-white hover:scale-105 hover:shadow-2xl cursor-pointer";
            if (answered) {
              if (isHeavier) {
                cardStyle = "bg-gradient-to-br from-green-100 to-emerald-200 ring-4 ring-green-500 scale-105";
              } else if (isSelected && !isCorrect) {
                cardStyle = "bg-gradient-to-br from-red-100 to-rose-200 ring-4 ring-red-500";
              } else {
                cardStyle = "bg-gray-100 opacity-60";
              }
            }

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(index)}
                disabled={answered}
                className={`relative rounded-3xl p-4 md:p-6 shadow-xl transition-all duration-300 ${cardStyle}`}
              >
                {/* Selection indicator */}
                {answered && isHeavier && (
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg animate-bounce">
                    ✓
                  </div>
                )}
                {answered && isSelected && !isCorrect && (
                  <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg animate-shake">
                    ✗
                  </div>
                )}

                {/* Pokemon Image */}
                <div className="relative">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={150}
                    height={150}
                    className={`mx-auto transition-transform duration-300 ${answered && isHeavier ? "animate-bounce" : ""}`}
                  />

                  {/* Weight badge (shown after answer) */}
                  {answered && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-lg font-bold shadow-lg">
                      {formatWeight(weight)}
                    </div>
                  )}
                </div>

                {/* Pokemon Name */}
                <h3 className="text-xl md:text-2xl font-bold text-center mt-4 text-gray-800">
                  {p.name}
                </h3>

                {/* Types */}
                <div className="flex justify-center gap-2 mt-2">
                  {p.types.map((type) => (
                    <span
                      key={type}
                      className="text-xs md:text-sm px-3 py-1 rounded-full bg-gray-200 text-gray-700 capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {/* Weight comparison (shown after answer) */}
                {answered && (
                  <p className="text-center text-sm text-purple-600 mt-2 font-medium">
                    {getWeightComparison(weight)}
                  </p>
                )}

                {/* Hover indicator */}
                {!answered && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/0 to-pink-500/0 hover:from-purple-500/10 hover:to-pink-500/10 transition-all pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* VS indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-black shadow-xl">
            VS
          </div>
        </div>
      </div>

      {/* Result Section */}
      {answered && (
        <div className="max-w-2xl mx-auto mt-8 text-center">
          {/* Level Up Animation */}
          {showLevelUp && newTitle && (
            <div className="mb-6 animate-bounce">
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-2xl">
                <div className="text-4xl mb-2">{newTitle.emoji}</div>
                <div className="text-2xl font-bold">LEVEL UP!</div>
                <div className="text-xl mt-2">You are now a {newTitle.title}!</div>
              </div>
            </div>
          )}

          {/* Result Message */}
          <div className={`text-2xl md:text-3xl font-bold mb-4 ${isCorrect ? "text-green-600" : "text-red-500"}`}>
            {isCorrect ? (
              <>
                {isBossRound ? "AMAZING! " : ""}
                {pair[selectedIndex!].name} is heavier!
              </>
            ) : (
              <>
                Oops! {pair[selectedIndex === 0 ? 1 : 0].name} is actually heavier!
              </>
            )}
          </div>

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className={`text-xl mb-4 ${isCorrect ? "text-green-500" : "text-orange-500"}`}>
              {feedbackMessage.emoji} {feedbackMessage.message}
            </div>
          )}

          {/* Weight Comparison */}
          {weightInfo && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-around items-center">
                <div>
                  <div className="font-bold text-lg text-purple-700">{pair[0].name}</div>
                  <div className="text-2xl font-black text-purple-600">{formatWeight(weightInfo.w0)}</div>
                </div>
                <div className="text-gray-400">
                  <span className="text-3xl">⚖️</span>
                </div>
                <div>
                  <div className="font-bold text-lg text-purple-700">{pair[1].name}</div>
                  <div className="text-2xl font-black text-purple-600">{formatWeight(weightInfo.w1)}</div>
                </div>
              </div>
              <div className="mt-3 text-purple-600 font-medium">
                Difference: {formatWeight(weightInfo.diff)} ({weightInfo.percentDiff}%)
              </div>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={nextRound}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-12 py-5 rounded-full font-bold text-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            Next Round!
          </button>
        </div>
      )}

      {/* Difficulty indicator */}
      {streak >= 5 && !answered && (
        <div className="text-center mt-6 text-purple-400 text-sm">
          Difficulty increasing - weights are getting closer!
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
