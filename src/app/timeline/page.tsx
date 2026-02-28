"use client";

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Generation data with ranges and colors
const GENERATIONS = [
  { gen: "I", label: "Gen 1", range: "#1-151", years: "1996", color: "bg-red-500", region: "Kanto" },
  { gen: "II", label: "Gen 2", range: "#152-251", years: "1999", color: "bg-yellow-500", region: "Johto" },
  { gen: "III", label: "Gen 3", range: "#252-386", years: "2002", color: "bg-green-500", region: "Hoenn" },
  { gen: "IV", label: "Gen 4", range: "#387-493", years: "2006", color: "bg-blue-500", region: "Sinnoh" },
  { gen: "V", label: "Gen 5", range: "#494-649", years: "2010", color: "bg-gray-700", region: "Unova" },
  { gen: "VI", label: "Gen 6", range: "#650-721", years: "2013", color: "bg-pink-500", region: "Kalos" },
  { gen: "VII", label: "Gen 7", range: "#722-809", years: "2016", color: "bg-orange-500", region: "Alola" },
  { gen: "VIII", label: "Gen 8", range: "#810-905", years: "2019", color: "bg-purple-500", region: "Galar" },
  { gen: "IX", label: "Gen 9", range: "#906-1025", years: "2022", color: "bg-violet-600", region: "Paldea" },
];

// Fun facts about each generation
const GENERATION_FACTS: Record<string, string[]> = {
  I: [
    "The original 151 Pokemon started it all!",
    "Pikachu became the mascot from Gen 1!",
    "Red and Blue were the first games!",
  ],
  II: [
    "Gen 2 introduced baby Pokemon!",
    "Pokemon could now hold items!",
    "Day and night cycles were added!",
  ],
  III: [
    "Double battles were introduced!",
    "Pokemon abilities were new in Gen 3!",
    "Natures were added to Pokemon!",
  ],
  IV: [
    "Online trading became possible!",
    "Physical and Special moves were split!",
    "The Sinnoh region was huge!",
  ],
  V: [
    "Gen 5 had the most new Pokemon ever!",
    "Triple battles were introduced!",
    "Seasons were added to the game!",
  ],
  VI: [
    "Mega Evolution was introduced!",
    "3D graphics came to Pokemon!",
    "Fairy type was added!",
  ],
  VII: [
    "Alola had regional Pokemon forms!",
    "Z-Moves were super powerful!",
    "Traditional gyms were replaced!",
  ],
  VIII: [
    "Dynamax made Pokemon giant!",
    "Wild Area was fully open world!",
    "Raids were added to Pokemon!",
  ],
  IX: [
    "Fully open world Pokemon!",
    "Terastallization changes types!",
    "Three different story paths!",
  ],
};

type GameMode = "classic" | "rush";

interface GameState {
  currentPokemon: Pokemon | null;
  queue: Pokemon[];
  score: number;
  totalAnswered: number;
  streak: number;
  bestStreak: number;
  correctAnswers: number;
  flashingBin: string | null;
  flashCorrect: boolean;
  timeRemaining: number;
  isGameActive: boolean;
  showResult: boolean;
  lastAnswer: { correct: boolean; pokemon: Pokemon; correctGen: string } | null;
}

export default function TimelinePage() {
  const { name: playerName } = usePlayer();
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [gameState, setGameState] = useState<GameState>({
    currentPokemon: null,
    queue: [],
    score: 0,
    totalAnswered: 0,
    streak: 0,
    bestStreak: 0,
    correctAnswers: 0,
    flashingBin: null,
    flashCorrect: false,
    timeRemaining: 60,
    isGameActive: false,
    showResult: false,
    lastAnswer: null,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [hoveredGen, setHoveredGen] = useState<string | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Shuffle Pokemon array
  const shufflePokemon = useCallback(() => {
    return [...pokemon].sort(() => Math.random() - 0.5);
  }, []);

  // Get next Pokemon from queue
  const getNextPokemon = useCallback((queue: Pokemon[]): { next: Pokemon | null; remaining: Pokemon[] } => {
    if (queue.length === 0) {
      const newQueue = shufflePokemon();
      return { next: newQueue[0], remaining: newQueue.slice(1) };
    }
    return { next: queue[0], remaining: queue.slice(1) };
  }, [shufflePokemon]);

  // Start a new game
  const startGame = useCallback(() => {
    const shuffled = shufflePokemon();
    const { next, remaining } = getNextPokemon(shuffled);

    setGameState({
      currentPokemon: next,
      queue: remaining,
      score: 0,
      totalAnswered: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      flashingBin: null,
      flashCorrect: false,
      timeRemaining: 60,
      isGameActive: true,
      showResult: false,
      lastAnswer: null,
    });
    setFeedbackMessage(null);

    // Announce the Pokemon
    if (next) {
      speak(`Sort ${next.name} to its generation!`);
    }

    // Start timer for Rush mode
    if (gameMode === "rush") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeRemaining <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, timeRemaining: 0, isGameActive: false };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }
  }, [gameMode, shufflePokemon, getNextPokemon]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle dropping Pokemon into a generation bin
  const handleDrop = useCallback((targetGen: string) => {
    if (!gameState.currentPokemon || !gameState.isGameActive) return;

    const correctGen = gameState.currentPokemon.generation;
    const isCorrect = targetGen === correctGen;

    // Play sound effects
    if (isCorrect) {
      playSound("success");
      speak("Correct!");
    } else {
      playSound("error");
      speak(`Oops! That was Generation ${correctGen}!`);
    }

    // Calculate score
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = 100;
      // Time bonus in Rush mode
      if (gameMode === "rush") {
        pointsEarned += Math.floor(gameState.timeRemaining * 2);
      }
      // Streak bonus
      const newStreak = gameState.streak + 1;
      if (newStreak >= 3) {
        pointsEarned += newStreak * 10;
      }
    }

    // Get personalized feedback
    if (isCorrect) {
      const msg = getQuickPersonalizedMessage(playerName, "correct_answer");
      setFeedbackMessage(msg);
    } else {
      const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setFeedbackMessage(msg);
    }

    // Flash the bin
    setGameState(prev => ({
      ...prev,
      flashingBin: targetGen,
      flashCorrect: isCorrect,
    }));

    // Clear flash after animation
    setTimeout(() => {
      setGameState(prev => ({ ...prev, flashingBin: null }));
    }, 500);

    // Check for milestone
    const newStreak = isCorrect ? gameState.streak + 1 : 0;
    if (isCorrect && newStreak > 0 && newStreak % 5 === 0) {
      playSound("powerup");
      speak(`${newStreak} in a row! Amazing!`);
    }

    // Update game state and get next Pokemon
    const { next, remaining } = getNextPokemon(gameState.queue);

    setGameState(prev => ({
      ...prev,
      lastAnswer: {
        correct: isCorrect,
        pokemon: prev.currentPokemon!,
        correctGen: correctGen,
      },
      showResult: gameMode === "classic",
      score: prev.score + pointsEarned,
      totalAnswered: prev.totalAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
      currentPokemon: gameMode === "rush" ? next : prev.currentPokemon,
      queue: gameMode === "rush" ? remaining : prev.queue,
    }));

    // In Rush mode, announce next Pokemon
    if (gameMode === "rush" && next) {
      setTimeout(() => {
        speak(next.name);
      }, 300);
    }

    setDraggedOver(null);
    setIsDragging(false);
  }, [gameState, gameMode, playerName, getNextPokemon]);

  // Continue to next Pokemon (Classic mode)
  const nextPokemon = useCallback(() => {
    const { next, remaining } = getNextPokemon(gameState.queue);
    setGameState(prev => ({
      ...prev,
      currentPokemon: next,
      queue: remaining,
      showResult: false,
      lastAnswer: null,
    }));
    setFeedbackMessage(null);

    if (next) {
      speak(next.name);
    }
  }, [gameState.queue, getNextPokemon]);

  // Drag event handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!gameState.currentPokemon) return;
    playSound("whoosh", { volume: 0.5 });
    setIsDragging(true);

    // Set drag data
    e.dataTransfer.setData("text/plain", gameState.currentPokemon.id.toString());
    e.dataTransfer.effectAllowed = "move";

    // Create custom drag image
    if (dragImageRef.current) {
      e.dataTransfer.setDragImage(dragImageRef.current, 60, 60);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedOver(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, gen: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggedOver(gen);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleBinDrop = (e: DragEvent<HTMLDivElement>, gen: string) => {
    e.preventDefault();
    handleDrop(gen);
  };

  // Calculate accuracy
  const accuracy = gameState.totalAnswered > 0
    ? Math.round((gameState.correctAnswers / gameState.totalAnswered) * 100)
    : 0;

  // Game over state
  const isGameOver = gameMode === "rush" && gameState.timeRemaining === 0 && !gameState.isGameActive;

  // Render game over screen
  if (isGameOver) {
    return (
      <div className="py-8 px-4 min-h-screen">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-indigo-600 mb-8">
          Time's Up!
        </h1>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4">
            {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "⭐" : "💪"}
          </div>

          <h2 className="text-3xl font-bold text-indigo-600 mb-4">
            Great job, {playerName}!
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-indigo-600">{gameState.score}</div>
              <div className="text-gray-600">Points</div>
            </div>
            <div className="bg-green-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-gray-600">Accuracy</div>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-orange-600">{gameState.bestStreak}</div>
              <div className="text-gray-600">Best Streak</div>
            </div>
            <div className="bg-purple-100 rounded-2xl p-4">
              <div className="text-3xl font-bold text-purple-600">{gameState.totalAnswered}</div>
              <div className="text-gray-600">Pokemon Sorted</div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="bg-indigo-600 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
          >
            Play Again!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 min-h-screen">
      <h1 className="text-4xl md:text-5xl font-bold text-center text-indigo-600 mb-2">
        Dex Timeline
      </h1>
      <p className="text-center text-lg text-indigo-400 mb-4">
        Drag each Pokemon to its Generation!
      </p>

      {/* Player name display */}
      <p className="text-center text-xl mb-4">
        Playing as <span className="font-bold text-indigo-600">{playerName}</span>
      </p>

      {/* Game mode selector */}
      {!gameState.isGameActive && !isGameOver && (
        <div className="max-w-xl mx-auto mb-6">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setGameMode("classic")}
              className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
                gameMode === "classic"
                  ? "bg-indigo-600 text-white scale-110 shadow-lg"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Classic Mode
            </button>
            <button
              onClick={() => setGameMode("rush")}
              className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
                gameMode === "rush"
                  ? "bg-orange-500 text-white scale-110 shadow-lg"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Rush Mode
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 text-center shadow">
            {gameMode === "classic" ? (
              <p className="text-gray-600">
                Take your time! Sort Pokemon one at a time and learn about each generation.
              </p>
            ) : (
              <p className="text-gray-600">
                60 seconds! Sort as many Pokemon as possible for the highest score!
              </p>
            )}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={startGame}
              className="bg-indigo-600 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
            >
              Start Game!
            </button>
          </div>
        </div>
      )}

      {/* Game stats bar */}
      {gameState.isGameActive && (
        <div className="flex justify-center gap-4 flex-wrap mb-6">
          <div className="bg-white px-5 py-2 rounded-full shadow">
            <span className="text-lg">
              Score: <span className="font-bold text-indigo-600">{gameState.score}</span>
            </span>
          </div>
          <div className="bg-white px-5 py-2 rounded-full shadow">
            <span className="text-lg">
              Streak: <span className="font-bold text-orange-500">{gameState.streak}</span>
            </span>
          </div>
          <div className="bg-white px-5 py-2 rounded-full shadow">
            <span className="text-lg">
              Accuracy: <span className="font-bold text-green-600">{accuracy}%</span>
            </span>
          </div>
          {gameMode === "rush" && (
            <div className={`px-5 py-2 rounded-full shadow ${
              gameState.timeRemaining <= 10 ? "bg-red-500 text-white animate-pulse" : "bg-white"
            }`}>
              <span className="text-lg font-bold">
                {gameState.timeRemaining}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Current Pokemon to sort */}
      {gameState.isGameActive && gameState.currentPokemon && !gameState.showResult && (
        <div className="max-w-md mx-auto mb-6">
          <div
            ref={dragImageRef}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-3xl p-6 shadow-xl text-center cursor-grab active:cursor-grabbing transition-all ${
              isDragging ? "opacity-50 scale-95" : "hover:scale-105"
            }`}
          >
            <Image
              src={gameState.currentPokemon.image}
              alt={gameState.currentPokemon.name}
              width={150}
              height={150}
              className="mx-auto mb-3"
              priority
            />
            <h2 className="text-2xl font-bold">{gameState.currentPokemon.name}</h2>
            <p className="text-gray-500 mt-1">#{gameState.currentPokemon.id}</p>
            <p className="text-indigo-500 mt-2 text-sm font-medium">
              Drag me to the correct generation!
            </p>
          </div>

          {/* Feedback message */}
          {feedbackMessage && (
            <div className="mt-4 text-center animate-bounce">
              <span className="bg-yellow-400 text-gray-800 px-6 py-2 rounded-full font-bold text-lg shadow-lg">
                {feedbackMessage.emoji} {feedbackMessage.message}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Result display (Classic mode) */}
      {gameState.showResult && gameState.lastAnswer && (
        <div className="max-w-md mx-auto mb-6">
          <div className={`bg-white rounded-3xl p-6 shadow-xl text-center ${
            gameState.lastAnswer.correct
              ? "ring-4 ring-green-400"
              : "ring-4 ring-red-400"
          }`}>
            <Image
              src={gameState.lastAnswer.pokemon.image}
              alt={gameState.lastAnswer.pokemon.name}
              width={120}
              height={120}
              className="mx-auto mb-3"
            />
            <h2 className="text-2xl font-bold">{gameState.lastAnswer.pokemon.name}</h2>

            <div className={`text-xl font-bold mt-3 ${
              gameState.lastAnswer.correct ? "text-green-600" : "text-red-500"
            }`}>
              {gameState.lastAnswer.correct ? (
                <>Correct! It's from Generation {gameState.lastAnswer.correctGen}!</>
              ) : (
                <>Oops! It's actually from Generation {gameState.lastAnswer.correctGen}!</>
              )}
            </div>

            {/* Fun fact about the generation */}
            <div className="bg-indigo-50 rounded-xl p-3 mt-4">
              <p className="text-indigo-700 text-sm">
                {GENERATION_FACTS[gameState.lastAnswer.correctGen][
                  Math.floor(Math.random() * GENERATION_FACTS[gameState.lastAnswer.correctGen].length)
                ]}
              </p>
            </div>

            {feedbackMessage && (
              <div className="mt-4">
                <span className="text-lg">
                  {feedbackMessage.emoji} {feedbackMessage.message}
                </span>
              </div>
            )}

            <button
              onClick={nextPokemon}
              className="mt-6 bg-indigo-600 text-white px-10 py-3 rounded-full font-bold text-xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
            >
              Next Pokemon!
            </button>
          </div>
        </div>
      )}

      {/* Generation bins */}
      {gameState.isGameActive && (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 md:gap-3">
            {GENERATIONS.map((gen) => {
              const isFlashing = gameState.flashingBin === gen.gen;
              const isDraggedOverThis = draggedOver === gen.gen;

              return (
                <div
                  key={gen.gen}
                  onDragOver={(e) => handleDragOver(e, gen.gen)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleBinDrop(e, gen.gen)}
                  onMouseEnter={() => setHoveredGen(gen.gen)}
                  onMouseLeave={() => setHoveredGen(null)}
                  className={`
                    relative rounded-2xl p-3 md:p-4 text-center transition-all duration-200 cursor-pointer
                    ${gen.color} text-white shadow-lg
                    ${isDraggedOverThis ? "scale-110 ring-4 ring-white shadow-2xl" : ""}
                    ${isFlashing && gameState.flashCorrect ? "animate-pulse ring-4 ring-green-300 scale-110" : ""}
                    ${isFlashing && !gameState.flashCorrect ? "animate-shake ring-4 ring-red-300" : ""}
                    hover:scale-105
                  `}
                >
                  <div className="font-bold text-lg md:text-xl">{gen.label}</div>
                  <div className="text-xs md:text-sm opacity-90">{gen.range}</div>
                  <div className="text-xs opacity-75 hidden md:block">{gen.region}</div>

                  {/* Hover tooltip with fun fact */}
                  {hoveredGen === gen.gen && !isDragging && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-48">
                      <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                        <div className="font-bold mb-1">{gen.region} ({gen.years})</div>
                        <div className="opacity-90">
                          {GENERATION_FACTS[gen.gen][0]}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stop game button */}
      {gameState.isGameActive && (
        <div className="text-center mt-8">
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setGameState(prev => ({ ...prev, isGameActive: false }));
            }}
            className="bg-gray-400 text-white px-8 py-2 rounded-full font-bold hover:bg-gray-500 transition-all"
          >
            End Game
          </button>
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
