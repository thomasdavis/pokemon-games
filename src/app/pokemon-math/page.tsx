"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";

// First 152 Pokemon
const allPokemon = pokemon.slice(0, 152);

// Get random Pokemon
const getRandomPokemon = () => allPokemon[Math.floor(Math.random() * allPokemon.length)];
const getRandomPokemonArray = (count: number) =>
  Array(count).fill(0).map(() => getRandomPokemon());

// ===========================================
// RESEARCH-BASED MATH TEACHING PRINCIPLES:
// ===========================================
// 1. Concrete-Representational-Abstract (CRA):
//    - Start with visual Pokemon as counters
//    - Move to number symbols with Pokemon context
//    - Finally pure arithmetic
//
// 2. Number Bonds/Decomposition:
//    - Understanding that numbers are made of parts
//    - e.g., 7 = 5 + 2, or 10 = 6 + 4
//
// 3. Counting On/Back Strategy:
//    - Don't start from 1, start from larger number
//    - e.g., 8 + 3 = start at 8, count 9, 10, 11
//
// 4. Progressive Difficulty:
//    - Level 1: Numbers 1-5 (single digit, tiny)
//    - Level 2: Numbers 1-10 (number bonds to 10)
//    - Level 3: Numbers 1-20 (teen numbers)
//    - Level 4: Numbers to 50 (two digit intro)
//    - Level 5: Numbers to 100 (full two digit)
//
// 5. Multiple Representations:
//    - Visual (Pokemon images)
//    - Symbolic (numbers)
//    - Verbal (spoken/written)
//
// 6. Immediate Positive Feedback:
//    - Celebrate success
//    - Gentle correction on mistakes
// ===========================================

// Level configurations
const LEVELS = [
  { id: 1, name: "Starter", maxNum: 5, description: "Numbers 1-5", color: "from-green-400 to-green-500" },
  { id: 2, name: "Trainer", maxNum: 10, description: "Numbers 1-10", color: "from-blue-400 to-blue-500" },
  { id: 3, name: "Ranger", maxNum: 20, description: "Numbers 1-20", color: "from-purple-400 to-purple-500" },
  { id: 4, name: "Expert", maxNum: 50, description: "Numbers 1-50", color: "from-orange-400 to-orange-500" },
  { id: 5, name: "Master", maxNum: 100, description: "Numbers 1-100", color: "from-red-400 to-red-500" },
];

// Game modes
type GameMode = "count" | "addition" | "subtraction" | "numberBonds" | "missing";

const MODES = [
  { id: "count" as GameMode, name: "Count Pokemon", icon: "🔢", description: "Count how many Pokemon you see" },
  { id: "addition" as GameMode, name: "Pokemon Team Up", icon: "➕", description: "Add Pokemon groups together" },
  { id: "subtraction" as GameMode, name: "Pokemon Escape", icon: "➖", description: "How many Pokemon are left?" },
  { id: "numberBonds" as GameMode, name: "Number Bonds", icon: "🔗", description: "Find pairs that make a number" },
  { id: "missing" as GameMode, name: "Missing Number", icon: "❓", description: "Find the missing number" },
];

// Encouraging messages
const correctMessages = [
  "Amazing! You're a math Pokemon Master! 🌟",
  "Fantastic! Your brain is super effective! ⚡",
  "Incredible! You caught the right answer! 🎯",
  "Wow! Professor Oak is impressed! 🎓",
  "Perfect! You're leveling up! ⬆️",
  "Brilliant! That's the spirit! ✨",
  "Yes! You're on fire! 🔥",
  "Superb! Keep catching those answers! 🎉",
];

const wrongMessages = [
  "Almost! Try counting again! 🤔",
  "So close! You've got this! 💪",
  "Oops! Let's try once more! 🌈",
  "Not quite! Take your time! ⏰",
  "Keep going! Math takes practice! 📚",
];

const getMessage = (correct: boolean) => {
  const messages = correct ? correctMessages : wrongMessages;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Generate a problem based on mode and level
interface Problem {
  mode: GameMode;
  visual1: typeof allPokemon;
  visual2: typeof allPokemon;
  num1: number;
  num2: number;
  answer: number;
  options: number[];
  question: string;
  targetNumber?: number; // For number bonds
}

const generateProblem = (mode: GameMode, maxNum: number): Problem => {
  let num1: number, num2: number, answer: number, question: string;
  let visual1: typeof allPokemon = [];
  let visual2: typeof allPokemon = [];
  let targetNumber: number | undefined;

  switch (mode) {
    case "count":
      answer = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      num1 = answer;
      num2 = 0;
      visual1 = getRandomPokemonArray(answer);
      question = "How many Pokemon do you see?";
      break;

    case "addition":
      num1 = Math.floor(Math.random() * Math.floor(maxNum / 2)) + 1;
      num2 = Math.floor(Math.random() * Math.floor(maxNum / 2)) + 1;
      answer = num1 + num2;
      visual1 = getRandomPokemonArray(Math.min(num1, 10));
      visual2 = getRandomPokemonArray(Math.min(num2, 10));
      question = `${num1} Pokemon + ${num2} Pokemon = ?`;
      break;

    case "subtraction":
      num1 = Math.floor(Math.random() * maxNum) + 2;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      answer = num1 - num2;
      visual1 = getRandomPokemonArray(Math.min(num1, 10));
      visual2 = getRandomPokemonArray(Math.min(num2, 10));
      question = `${num1} Pokemon - ${num2} escaped = ?`;
      break;

    case "numberBonds":
      targetNumber = Math.min(Math.floor(Math.random() * maxNum) + 5, maxNum);
      num1 = Math.floor(Math.random() * (targetNumber - 1)) + 1;
      num2 = targetNumber - num1;
      answer = num2;
      visual1 = getRandomPokemonArray(Math.min(num1, 8));
      question = `${num1} + ? = ${targetNumber}`;
      break;

    case "missing":
      const isAddition = Math.random() > 0.5;
      if (isAddition) {
        answer = Math.floor(Math.random() * Math.floor(maxNum / 2)) + 1;
        num2 = Math.floor(Math.random() * Math.floor(maxNum / 2)) + 1;
        num1 = answer + num2;
        question = `? + ${num2} = ${num1}`;
      } else {
        num1 = Math.floor(Math.random() * maxNum) + 2;
        answer = Math.floor(Math.random() * (num1 - 1)) + 1;
        num2 = num1 - answer;
        question = `${num1} - ? = ${num2}`;
      }
      break;

    default:
      num1 = 1;
      num2 = 1;
      answer = 2;
      question = "1 + 1 = ?";
  }

  // Generate answer options (including correct answer)
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 5) - 2;
    const option = Math.max(0, answer + offset + (options.has(answer + offset) ? Math.floor(Math.random() * 3) + 1 : 0));
    if (option !== answer && option >= 0 && option <= maxNum + 5) {
      options.add(option);
    }
  }

  return {
    mode,
    visual1,
    visual2,
    num1,
    num2,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
    question,
    targetNumber,
  };
};

export default function PokemonMathPage() {
  const [gameState, setGameState] = useState<"menu" | "modeSelect" | "playing" | "result">("menu");
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [currentMode, setCurrentMode] = useState<GameMode>("count");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showVisualHint, setShowVisualHint] = useState(true);
  const gameRef = useRef<HTMLDivElement>(null);

  // Start game with selected mode
  const startGame = (mode: GameMode) => {
    setCurrentMode(mode);
    setProblem(generateProblem(mode, currentLevel.maxNum));
    setSelectedAnswer(null);
    setIsCorrect(null);
    setMessage("");
    setScore(0);
    setStreak(0);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setGameState("playing");
  };

  // Handle answer selection
  const handleAnswer = (answer: number) => {
    if (selectedAnswer !== null || !problem) return;

    setSelectedAnswer(answer);
    const correct = answer === problem.answer;
    setIsCorrect(correct);
    setMessage(getMessage(correct));
    setQuestionsAnswered(q => q + 1);

    if (correct) {
      setScore(s => s + (currentLevel.id * 10) + (streak * 5));
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setCorrectAnswers(c => c + 1);
    } else {
      setStreak(0);
    }

    // Auto advance after 1.5 seconds
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  // Next question
  const nextQuestion = () => {
    setProblem(generateProblem(currentMode, currentLevel.maxNum));
    setSelectedAnswer(null);
    setIsCorrect(null);
    setMessage("");
  };

  // Keyboard support for answers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== "playing" || !problem || selectedAnswer !== null) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        handleAnswer(problem.options[num - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, problem, selectedAnswer]);

  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

  return (
    <div
      ref={gameRef}
      className="min-h-screen bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 p-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Pokemon Math! 🧮
          </h1>
          <p className="text-xl text-white/80">Learn math with your favorite Pokemon!</p>
        </div>

        {/* Main Menu */}
        {gameState === "menu" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Choose Your Level</h2>

            <div className="space-y-4 mb-8">
              {LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => {
                    setCurrentLevel(level);
                    setGameState("modeSelect");
                  }}
                  className={`w-full p-4 rounded-2xl bg-gradient-to-r ${level.color} text-white font-bold text-xl hover:scale-102 transition-transform shadow-lg flex justify-between items-center`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{"⭐".repeat(level.id)}</span>
                    <span>Level {level.id}: {level.name}</span>
                  </div>
                  <span className="text-white/80">{level.description}</span>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              <h3 className="font-bold mb-2">🎓 Based on Math Education Research:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Visual counting with Pokemon (Concrete learning)</li>
                <li>Number bonds and decomposition</li>
                <li>Progressive difficulty from 1-5 to 1-100</li>
                <li>Immediate positive feedback</li>
                <li>Multiple ways to see the same problem</li>
              </ul>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        {gameState === "modeSelect" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setGameState("menu")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                Level {currentLevel.id}: {currentLevel.name}
              </h2>
              <div className="w-16" />
            </div>

            <h3 className="text-xl text-gray-600 mb-6 text-center">Choose a Game Mode</h3>

            <div className="grid gap-4">
              {MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => startGame(mode.id)}
                  className="p-4 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-100 hover:to-purple-100 transition-colors text-left flex items-center gap-4 shadow-md hover:shadow-lg"
                >
                  <span className="text-4xl">{mode.icon}</span>
                  <div>
                    <div className="font-bold text-xl text-gray-800">{mode.name}</div>
                    <div className="text-gray-600">{mode.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Visual hint toggle */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="text-gray-600">Show Pokemon visuals:</span>
              <button
                onClick={() => setShowVisualHint(!showVisualHint)}
                className={`px-4 py-2 rounded-full font-bold transition-colors ${
                  showVisualHint
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {showVisualHint ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        )}

        {/* Game Playing */}
        {gameState === "playing" && problem && (
          <>
            {/* Score Bar */}
            <div className="grid grid-cols-4 gap-3 mb-6 text-center">
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="text-3xl font-bold text-white">{score}</div>
                <div className="text-sm text-white/80">Score</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="text-3xl font-bold text-yellow-300">{streak}🔥</div>
                <div className="text-sm text-white/80">Streak</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="text-3xl font-bold text-green-300">{accuracy}%</div>
                <div className="text-sm text-white/80">Accuracy</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="text-3xl font-bold text-purple-300">{questionsAnswered}</div>
                <div className="text-sm text-white/80">Questions</div>
              </div>
            </div>

            {/* Problem Card */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              {/* Mode indicator */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setGameState("modeSelect")}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ← Change Mode
                </button>
                <div className="text-lg font-bold text-purple-600">
                  {MODES.find(m => m.id === currentMode)?.icon} {MODES.find(m => m.id === currentMode)?.name}
                </div>
                <div className="text-sm text-gray-500">
                  Level {currentLevel.id}
                </div>
              </div>

              {/* Visual Pokemon Display */}
              {showVisualHint && problem.visual1.length > 0 && problem.visual1.length <= 12 && (
                <div className="mb-6">
                  <div className="flex flex-wrap justify-center gap-2 p-4 bg-green-50 rounded-2xl">
                    {problem.visual1.map((p, i) => (
                      <div
                        key={i}
                        className={`transition-all duration-300 ${
                          currentMode === "subtraction" && i >= problem.visual1.length - Math.min(problem.num2, 10)
                            ? "opacity-30 grayscale"
                            : ""
                        }`}
                      >
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={50}
                          height={50}
                          className="drop-shadow"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Second group for addition */}
                  {currentMode === "addition" && problem.visual2.length > 0 && (
                    <>
                      <div className="text-center text-4xl my-2">➕</div>
                      <div className="flex flex-wrap justify-center gap-2 p-4 bg-blue-50 rounded-2xl">
                        {problem.visual2.map((p, i) => (
                          <Image
                            key={i}
                            src={p.image}
                            alt={p.name}
                            width={50}
                            height={50}
                            className="drop-shadow"
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Escaped indicator for subtraction */}
                  {currentMode === "subtraction" && problem.visual2.length > 0 && (
                    <div className="text-center mt-2 text-gray-500">
                      <span className="text-2xl">💨</span> {problem.num2} Pokemon escaped!
                    </div>
                  )}
                </div>
              )}

              {/* Question */}
              <div className="text-center mb-8">
                <div className="text-4xl font-bold text-gray-800 mb-2">
                  {problem.question}
                </div>
                {currentMode === "numberBonds" && (
                  <div className="text-lg text-purple-600">
                    Find the number that makes {problem.targetNumber}!
                  </div>
                )}
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {problem.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrectAnswer = option === problem.answer;
                  const showResult = selectedAnswer !== null;

                  let buttonClass = "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600";

                  if (showResult) {
                    if (isCorrectAnswer) {
                      buttonClass = "bg-gradient-to-r from-green-400 to-green-500 scale-105";
                    } else if (isSelected && !isCorrectAnswer) {
                      buttonClass = "bg-gradient-to-r from-red-400 to-red-500";
                    } else {
                      buttonClass = "bg-gray-300 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                      className={`p-6 rounded-2xl text-white font-bold text-3xl shadow-lg transition-all ${buttonClass}`}
                    >
                      {option}
                      <div className="text-sm font-normal mt-1 opacity-80">
                        Press {index + 1}
                      </div>
                      {showResult && isCorrectAnswer && (
                        <div className="text-2xl mt-1">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {message && (
                <div className={`mt-6 text-center p-4 rounded-2xl text-xl font-bold ${
                  isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {message}
                  {isCorrect && <span className="ml-2">+{currentLevel.id * 10 + (streak - 1) * 5} points!</span>}
                </div>
              )}
            </div>

            {/* Counting Strategy Hint */}
            {currentMode === "addition" && problem.num1 > 5 && showVisualHint && selectedAnswer === null && (
              <div className="mt-4 bg-yellow-100 rounded-xl p-4 text-center text-yellow-800">
                <strong>💡 Tip:</strong> Start from the bigger number ({Math.max(problem.num1, problem.num2)}) and count up!
              </div>
            )}
          </>
        )}

        {/* Back to menu button when playing */}
        {gameState === "playing" && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                if (questionsAnswered > 0) {
                  setGameState("result");
                } else {
                  setGameState("menu");
                }
              }}
              className="text-white/80 hover:text-white underline"
            >
              End Game & See Results
            </button>
          </div>
        )}

        {/* Results Screen */}
        {gameState === "result" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">
              {accuracy >= 90 ? "🏆" : accuracy >= 70 ? "🌟" : accuracy >= 50 ? "👍" : "💪"}
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Great Practice!</h2>

            <div className="space-y-3 mb-8 text-left bg-gray-50 rounded-2xl p-6">
              <div className="flex justify-between text-lg">
                <span>Questions Answered:</span>
                <span className="font-bold">{questionsAnswered}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Correct Answers:</span>
                <span className="font-bold text-green-600">{correctAnswers}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Accuracy:</span>
                <span className="font-bold text-purple-600">{accuracy}%</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Best Streak:</span>
                <span className="font-bold text-orange-600">{bestStreak}🔥</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-3 mt-3">
                <span>Final Score:</span>
                <span className="font-bold text-2xl text-blue-600">{score}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => startGame(currentMode)}
                className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-4 px-8 rounded-full text-xl hover:scale-105 transition-transform"
              >
                Play Again
              </button>
              <button
                onClick={() => setGameState("modeSelect")}
                className="w-full bg-gradient-to-r from-purple-400 to-purple-500 text-white font-bold py-4 px-8 rounded-full text-xl hover:scale-105 transition-transform"
              >
                Try Different Mode
              </button>
              <button
                onClick={() => setGameState("menu")}
                className="w-full bg-gray-200 text-gray-700 font-bold py-4 px-8 rounded-full text-xl hover:scale-105 transition-transform"
              >
                Change Level
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
