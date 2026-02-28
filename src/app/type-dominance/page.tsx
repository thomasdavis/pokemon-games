"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { allTypes } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Complete Pokemon Type Effectiveness Chart
// Values: 2 = super effective, 0.5 = not very effective, 0 = no effect, 1 = normal
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: {
    rock: 0.5, ghost: 0, steel: 0.5
  },
  fire: {
    fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2
  },
  water: {
    fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5
  },
  electric: {
    water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5
  },
  grass: {
    fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5
  },
  ice: {
    fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5
  },
  fighting: {
    normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5
  },
  poison: {
    grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2
  },
  ground: {
    fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2
  },
  flying: {
    electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5
  },
  psychic: {
    fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5
  },
  bug: {
    fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5
  },
  rock: {
    fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5
  },
  ghost: {
    normal: 0, psychic: 2, ghost: 2, dark: 0.5
  },
  dragon: {
    dragon: 2, steel: 0.5, fairy: 0
  },
  dark: {
    fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5
  },
  steel: {
    fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2
  },
  fairy: {
    fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5
  },
};

// Type colors for display
const typeColors: Record<string, string> = {
  normal: "bg-gray-400",
  fire: "bg-red-500",
  water: "bg-blue-500",
  electric: "bg-yellow-400",
  grass: "bg-green-500",
  ice: "bg-cyan-300",
  fighting: "bg-orange-700",
  poison: "bg-purple-500",
  ground: "bg-amber-600",
  flying: "bg-indigo-300",
  psychic: "bg-pink-500",
  bug: "bg-lime-500",
  rock: "bg-stone-500",
  ghost: "bg-purple-700",
  dragon: "bg-violet-600",
  dark: "bg-gray-700",
  steel: "bg-slate-400",
  fairy: "bg-pink-300",
};

// Type emojis
const typeEmojis: Record<string, string> = {
  normal: "⚪",
  fire: "🔥",
  water: "💧",
  electric: "⚡",
  grass: "🌿",
  ice: "❄️",
  fighting: "👊",
  poison: "☠️",
  ground: "🏜️",
  flying: "🦅",
  psychic: "🔮",
  bug: "🐛",
  rock: "🪨",
  ghost: "👻",
  dragon: "🐉",
  dark: "🌙",
  steel: "⚙️",
  fairy: "✨",
};

// Get type color with fallback
const getTypeColor = (type: string): string => typeColors[type] || "bg-gray-500";
const getTypeEmoji = (type: string): string => typeEmojis[type] || "❓";

// Calculate type effectiveness
function typeEffect(attacker: string, defenderTypes: string[]): number {
  let multiplier = 1;
  for (const defender of defenderTypes) {
    const attackerChart = TYPE_CHART[attacker] || {};
    const effectiveness = attackerChart[defender];
    if (effectiveness !== undefined) {
      multiplier *= effectiveness;
    }
  }
  return multiplier;
}

// Difficulty settings
type Difficulty = "single" | "dual" | "all";

const DIFFICULTY_SETTINGS: Record<Difficulty, { label: string; description: string }> = {
  single: { label: "Single Types", description: "One defender type" },
  dual: { label: "Dual Types", description: "Two defender types" },
  all: { label: "All Types", description: "Mix of single and dual" },
};

// Time settings
const QUESTION_TIME = 5000; // 5 seconds per question

interface GameState {
  attacker: string;
  defenders: string[];
  correctAnswer: "super" | "normal" | "not_very" | "immune";
  multiplier: number;
}

export default function TypeDominancePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("single");
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState<GameState | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [reactionTime, setReactionTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const { name: playerName } = usePlayer();

  // Generate a random round
  const generateRound = useCallback((): GameState => {
    const types = allTypes.filter(t => TYPE_CHART[t] !== undefined);
    const attacker = types[Math.floor(Math.random() * types.length)];

    let defenders: string[];
    if (difficulty === "single") {
      defenders = [types[Math.floor(Math.random() * types.length)]];
    } else if (difficulty === "dual") {
      const type1 = types[Math.floor(Math.random() * types.length)];
      let type2 = types[Math.floor(Math.random() * types.length)];
      while (type2 === type1) {
        type2 = types[Math.floor(Math.random() * types.length)];
      }
      defenders = [type1, type2];
    } else {
      // "all" - random single or dual
      if (Math.random() < 0.5) {
        defenders = [types[Math.floor(Math.random() * types.length)]];
      } else {
        const type1 = types[Math.floor(Math.random() * types.length)];
        let type2 = types[Math.floor(Math.random() * types.length)];
        while (type2 === type1) {
          type2 = types[Math.floor(Math.random() * types.length)];
        }
        defenders = [type1, type2];
      }
    }

    const multiplier = typeEffect(attacker, defenders);
    let correctAnswer: "super" | "normal" | "not_very" | "immune";

    if (multiplier === 0) {
      correctAnswer = "immune";
    } else if (multiplier >= 2) {
      correctAnswer = "super";
    } else if (multiplier < 1) {
      correctAnswer = "not_very";
    } else {
      correctAnswer = "normal";
    }

    return { attacker, defenders, correctAnswer, multiplier };
  }, [difficulty]);

  // Start a new game
  const startGame = useCallback(() => {
    setGameStarted(true);
    setScore(0);
    setStreak(0);
    setQuestionsAnswered(0);
    setFeedbackMessage(null);

    const round = generateRound();
    setCurrentRound(round);
    setAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTimeLeft(QUESTION_TIME);
    startTimeRef.current = Date.now();

    // Announce the matchup
    speak(`${round.attacker} attacks ${round.defenders.join(" and ")}`);
  }, [generateRound]);

  // Handle answer selection
  const handleAnswer = (answer: string) => {
    if (answered || !currentRound) return;

    playSound('click');

    // Calculate reaction time
    const reaction = Date.now() - startTimeRef.current;
    setReactionTime(reaction);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSelectedAnswer(answer);
    setAnswered(true);
    setQuestionsAnswered(prev => prev + 1);
    setShowExplanation(true);

    const isCorrect = answer === currentRound.correctAnswer;

    if (isCorrect) {
      // Calculate score based on reaction time
      const timeBonus = Math.max(0, Math.floor((QUESTION_TIME - reaction) / 100));
      const streakBonus = streak * 10;
      const roundScore = 100 + timeBonus + streakBonus;

      setScore(prev => prev + roundScore);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });

      playSound('success');

      // Check for combo/streak sounds
      if (streak >= 2) {
        playSound('combo');
        speak("Combo!");
      }

      const msg = getQuickPersonalizedMessage(playerName, 'correct_answer');
      setFeedbackMessage(msg);
    } else {
      setStreak(0);
      playSound('error');

      const msg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
      setFeedbackMessage(msg);
    }
  };

  // Handle timeout
  const handleTimeout = useCallback(() => {
    if (answered || !currentRound) return;

    setAnswered(true);
    setQuestionsAnswered(prev => prev + 1);
    setShowExplanation(true);
    setStreak(0);

    playSound('error');
    speak("Time's up!");

    const msg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
    setFeedbackMessage(msg);
  }, [answered, currentRound, playerName]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || answered || !currentRound) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          handleTimeout();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, answered, currentRound, handleTimeout]);

  // Next round
  const nextRound = () => {
    const round = generateRound();
    setCurrentRound(round);
    setAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackMessage(null);
    setTimeLeft(QUESTION_TIME);
    startTimeRef.current = Date.now();

    // Announce the matchup
    speak(`${round.attacker} attacks ${round.defenders.join(" and ")}`);
  };

  // Get answer label
  const getAnswerLabel = (answer: string): string => {
    switch (answer) {
      case "super": return "Super Effective!";
      case "normal": return "Normal";
      case "not_very": return "Not Very Effective";
      case "immune": return "No Effect";
      default: return answer;
    }
  };

  // Get effectiveness explanation
  const getExplanation = (): string => {
    if (!currentRound) return "";
    const { attacker, defenders, multiplier } = currentRound;

    if (multiplier === 0) {
      return `${attacker} type moves have no effect on ${defenders.join("/")} types!`;
    } else if (multiplier >= 4) {
      return `${attacker} is 4x super effective against ${defenders.join("/")}! Both types are weak to it!`;
    } else if (multiplier >= 2) {
      return `${attacker} is super effective against ${defenders.join("/")} (${multiplier}x damage)`;
    } else if (multiplier <= 0.25) {
      return `${attacker} is very resisted by ${defenders.join("/")} (${multiplier}x damage)!`;
    } else if (multiplier < 1) {
      return `${attacker} is not very effective against ${defenders.join("/")} (${multiplier}x damage)`;
    }
    return `${attacker} deals normal damage to ${defenders.join("/")} (1x)`;
  };

  // Calculate timer color
  const getTimerColor = (): string => {
    const percentage = timeLeft / QUESTION_TIME;
    if (percentage > 0.5) return "bg-green-500";
    if (percentage > 0.25) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Answer button styles
  const getAnswerButtonStyle = (answer: string): string => {
    const baseStyle = "w-full py-4 px-6 rounded-2xl font-bold text-xl transition-all ";

    if (!answered) {
      return baseStyle + "bg-white hover:bg-yellow-100 hover:scale-105 shadow-lg border-2 border-gray-200";
    }

    if (answer === currentRound?.correctAnswer) {
      return baseStyle + "bg-green-500 text-white scale-105 ring-4 ring-green-300";
    }

    if (answer === selectedAnswer && answer !== currentRound?.correctAnswer) {
      return baseStyle + "bg-red-500 text-white opacity-75";
    }

    return baseStyle + "bg-gray-200 opacity-50";
  };

  // Start screen
  if (!gameStarted) {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
          Type Dominance
        </h1>
        <p className="text-center text-xl text-gray-600 mb-8">
          Test your Pokemon type knowledge!
        </p>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-center mb-6">
            Welcome, {playerName}!
          </h2>

          <p className="text-center text-gray-600 mb-6">
            Quick-fire battle prompts! Determine if an attack is Super Effective, Normal, Not Very Effective, or has No Effect.
          </p>

          {/* Difficulty selection */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 text-center">Select Difficulty:</h3>
            <div className="grid grid-cols-3 gap-4">
              {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`p-4 rounded-xl font-bold transition-all ${
                    difficulty === d
                      ? "bg-orange-500 text-white scale-105 shadow-lg"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div className="text-lg">{DIFFICULTY_SETTINGS[d].label}</div>
                  <div className={`text-sm ${difficulty === d ? "text-orange-100" : "text-gray-500"}`}>
                    {DIFFICULTY_SETTINGS[d].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* How to play */}
          <div className="bg-yellow-50 rounded-2xl p-4 mb-6">
            <h3 className="font-bold text-lg mb-2">How to Play:</h3>
            <ul className="text-gray-700 space-y-1">
              <li>An attacking type vs defender type(s) will appear</li>
              <li>Click the correct effectiveness before time runs out!</li>
              <li>Faster answers = more points</li>
              <li>Build streaks for bonus points!</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-orange-500 text-white py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
          >
            Start Game!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
        Type Dominance
      </h1>

      {/* Stats bar */}
      <div className="flex justify-center gap-4 flex-wrap text-lg mb-6">
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Score: <span className="font-bold text-green-600">{score}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Streak: <span className="font-bold text-orange-600">{streak}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Best: <span className="font-bold text-purple-600">{bestStreak}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow">
          Q: <span className="font-bold">{questionsAnswered}</span>
        </span>
      </div>

      {/* Timer bar */}
      {!answered && currentRound && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${getTimerColor()}`}
              style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
            />
          </div>
          <p className="text-center text-gray-500 mt-1">
            {(timeLeft / 1000).toFixed(1)}s
          </p>
        </div>
      )}

      {/* Main game area */}
      {currentRound && (
        <div className="max-w-2xl mx-auto">
          {/* Battle display */}
          <div className="bg-white rounded-3xl p-8 mb-6 shadow-xl">
            {/* Attacker */}
            <div className="text-center mb-6">
              <p className="text-gray-500 text-lg mb-2">Attacking Type</p>
              <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl ${getTypeColor(currentRound.attacker)} text-white shadow-lg`}>
                <span className="text-4xl">{getTypeEmoji(currentRound.attacker)}</span>
                <span className="text-3xl font-bold capitalize">{currentRound.attacker}</span>
              </div>
            </div>

            {/* VS */}
            <div className="text-center text-4xl font-bold text-gray-400 my-4">
              VS
            </div>

            {/* Defenders */}
            <div className="text-center">
              <p className="text-gray-500 text-lg mb-2">Defending Type{currentRound.defenders.length > 1 ? "s" : ""}</p>
              <div className="flex justify-center gap-4 flex-wrap">
                {currentRound.defenders.map((defender, idx) => (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl ${getTypeColor(defender)} text-white shadow-lg`}
                  >
                    <span className="text-4xl">{getTypeEmoji(defender)}</span>
                    <span className="text-3xl font-bold capitalize">{defender}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMessage && (
            <div className="text-center mb-4 animate-bounce">
              <div className="inline-block bg-yellow-100 rounded-2xl px-6 py-3">
                <span className="text-2xl mr-2">{feedbackMessage.emoji}</span>
                <span className="text-xl font-medium">{feedbackMessage.message}</span>
              </div>
            </div>
          )}

          {/* Answer buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {["super", "normal", "not_very", "immune"].map((answer) => (
              <button
                key={answer}
                onClick={() => handleAnswer(answer)}
                disabled={answered}
                className={getAnswerButtonStyle(answer)}
              >
                <div className="text-2xl mb-1">
                  {answer === "super" && "2x+"}
                  {answer === "normal" && "1x"}
                  {answer === "not_very" && "0.5x"}
                  {answer === "immune" && "0x"}
                </div>
                <div className="text-base">
                  {getAnswerLabel(answer)}
                </div>
              </button>
            ))}
          </div>

          {/* Explanation after answer */}
          {showExplanation && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-center">
              <p className="font-bold text-lg text-blue-800 mb-2">
                {currentRound.multiplier}x Damage
              </p>
              <p className="text-gray-700">{getExplanation()}</p>
              {reactionTime > 0 && selectedAnswer === currentRound.correctAnswer && (
                <p className="text-gray-500 mt-2">
                  Reaction time: {(reactionTime / 1000).toFixed(2)}s
                </p>
              )}
            </div>
          )}

          {/* Next button */}
          {answered && (
            <div className="text-center">
              <button
                onClick={nextRound}
                className="bg-orange-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
              >
                Next Question!
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
