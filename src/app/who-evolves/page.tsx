"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Precompute which Pokemon can evolve (have a next evolution stage)
// A Pokemon can evolve if its name (lowercased) appears as someone else's evolves_from
const evolvesFromSet = new Set(
  pokemon
    .map((p) => p.evolves_from?.toLowerCase())
    .filter((name): name is string => name !== null && name !== undefined)
);

const canEvolveMap = new Map<number, boolean>();
pokemon.forEach((p) => {
  canEvolveMap.set(p.id, evolvesFromSet.has(p.name.toLowerCase()));
});

// Get Pokemon that can evolve
const evolvingPokemon = pokemon.filter((p) => canEvolveMap.get(p.id));
const nonEvolvingPokemon = pokemon.filter((p) => !canEvolveMap.get(p.id));

interface CardState {
  pokemon: Pokemon;
  canEvolve: boolean;
  isClicked: boolean;
  isCorrect: boolean | null;
}

const GAME_DURATION = 30; // seconds
const TIME_PENALTY = 2; // seconds deducted for wrong clicks
const GRID_SIZE = 12; // 4x3 grid
const HIGH_SCORE_KEY = "who_evolves_high_score";

export default function WhoEvolvesPage() {
  const [gameState, setGameState] = useState<"start" | "playing" | "ended">("start");
  const [cards, setCards] = useState<CardState[]>([]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalEvolvingInRound, setTotalEvolvingInRound] = useState(0);
  const [correctFound, setCorrectFound] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [message, setMessage] = useState<{ text: string; emoji: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const { name: playerName } = usePlayer();

  // Load high score from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      if (saved) setHighScore(parseInt(saved, 10));
    }
  }, []);

  // Generate balanced card set
  const generateCards = useCallback(() => {
    // Target 6-8 evolving Pokemon for a balanced challenge
    const numEvolving = 6 + Math.floor(Math.random() * 3); // 6-8
    const numNonEvolving = GRID_SIZE - numEvolving;

    // Randomly select evolving Pokemon
    const shuffledEvolving = [...evolvingPokemon].sort(() => Math.random() - 0.5);
    const selectedEvolving = shuffledEvolving.slice(0, numEvolving);

    // Randomly select non-evolving Pokemon
    const shuffledNonEvolving = [...nonEvolvingPokemon].sort(() => Math.random() - 0.5);
    const selectedNonEvolving = shuffledNonEvolving.slice(0, numNonEvolving);

    // Combine and shuffle
    const allSelected = [...selectedEvolving, ...selectedNonEvolving];
    const shuffled = allSelected.sort(() => Math.random() - 0.5);

    const newCards: CardState[] = shuffled.map((p) => ({
      pokemon: p,
      canEvolve: canEvolveMap.get(p.id) || false,
      isClicked: false,
      isCorrect: null,
    }));

    setCards(newCards);
    setTotalEvolvingInRound(numEvolving);
    setCorrectFound(0);
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    speak("3");
    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        speak(count.toString());
        playSound("countdown");
      } else if (count === 0) {
        speak("Go!");
        playSound("powerup");
        if (countdownRef.current) clearInterval(countdownRef.current);
        // Start the actual game
        setGameState("playing");
        setTimeLeft(GAME_DURATION);
        setScore(0);
        setCombo(0);
        generateCards();
      }
    }, 1000);
  }, [generateCards]);

  // Start game
  const startGame = useCallback(() => {
    setGameState("start");
    setMessage(null);
    startCountdown();
  }, [startCountdown]);

  // Timer effect
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up!
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState("ended");
            playSound("lose");
            speak("Time's up!");
            return 0;
          }
          // Warning sound when time is low
          if (prev <= 5) {
            playSound("countdown", { volume: 0.5 });
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  // Check if all evolving Pokemon found
  useEffect(() => {
    if (gameState === "playing" && correctFound === totalEvolvingInRound && totalEvolvingInRound > 0) {
      // Win!
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState("ended");
      playSound("win");
      celebrateWin();

      // Check for high score
      if (score > highScore) {
        setHighScore(score);
        if (typeof window !== "undefined") {
          localStorage.setItem(HIGH_SCORE_KEY, score.toString());
        }
        const msg = getQuickPersonalizedMessage(playerName, "new_high_score", { score });
        setMessage({ text: msg.message, emoji: msg.emoji });
      } else {
        const msg = getQuickPersonalizedMessage(playerName, "won_game", { score });
        setMessage({ text: msg.message, emoji: msg.emoji });
      }
    }
  }, [gameState, correctFound, totalEvolvingInRound, score, highScore, playerName]);

  // Handle card click
  const handleCardClick = useCallback(
    (index: number) => {
      if (gameState !== "playing") return;

      const card = cards[index];
      if (card.isClicked) return; // Already clicked

      playSound("click");

      const isCorrect = card.canEvolve;

      // Update card state
      setCards((prev) =>
        prev.map((c, i) =>
          i === index ? { ...c, isClicked: true, isCorrect } : c
        )
      );

      if (isCorrect) {
        // Correct!
        const newCombo = combo + 1;
        setCombo(newCombo);
        const comboMultiplier = Math.min(newCombo, 5); // Max 5x multiplier
        const pointsEarned = 10 * comboMultiplier;
        setScore((prev) => prev + pointsEarned);
        setCorrectFound((prev) => prev + 1);

        playSound("success");
        if (newCombo >= 3) {
          playSound("combo", { volume: 0.7 });
        }

        const msg = getQuickPersonalizedMessage(playerName, "correct_answer");
        setMessage({ text: `${msg.message} +${pointsEarned}`, emoji: msg.emoji });
        setTimeout(() => setMessage(null), 1500);
      } else {
        // Wrong!
        setCombo(0);
        setTimeLeft((prev) => Math.max(0, prev - TIME_PENALTY));
        playSound("error");

        const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
        setMessage({ text: `${msg.message} -${TIME_PENALTY}s`, emoji: msg.emoji });
        setTimeout(() => setMessage(null), 1500);
      }
    },
    [gameState, cards, combo, playerName]
  );

  // Calculate timer bar width percentage
  const timerPercentage = (timeLeft / GAME_DURATION) * 100;
  const timerColor =
    timeLeft > 10
      ? "bg-green-500"
      : timeLeft > 5
      ? "bg-yellow-500"
      : "bg-red-500 animate-pulse";

  // Count remaining evolving Pokemon
  const evolvingRemaining = cards.filter((c) => c.canEvolve && !c.isClicked).length;

  return (
    <div className="py-4 min-h-screen">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent mb-1">
          Who Evolves?
        </h1>
        <p className="text-sm sm:text-lg text-gray-600">
          Click all Pokemon that CAN evolve!
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex justify-center gap-2 sm:gap-4 mb-4 flex-wrap text-sm sm:text-base">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-3 sm:px-5 py-2 rounded-full shadow-lg">
          <span className="text-white font-bold">
            Score: {score}
          </span>
        </div>
        {combo > 1 && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 sm:px-5 py-2 rounded-full shadow-lg animate-pulse">
            <span className="text-white font-bold">
              {combo}x Combo!
            </span>
          </div>
        )}
        <div className="bg-gradient-to-r from-blue-400 to-cyan-400 px-3 sm:px-5 py-2 rounded-full shadow-lg">
          <span className="text-white font-bold">
            High: {highScore}
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      {gameState === "playing" && (
        <div className="max-w-2xl mx-auto mb-4 px-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">Time left:</span>
            <span className={`text-xl font-bold ${timeLeft <= 5 ? "text-red-500" : "text-gray-700"}`}>
              {timeLeft}s
            </span>
            <span className="text-sm text-gray-500 ml-auto">
              {evolvingRemaining} left to find
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${timerColor} transition-all duration-300 ease-linear`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Message Popup */}
      {message && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-white px-6 py-3 rounded-full shadow-xl border-2 border-yellow-400 font-bold text-lg sm:text-xl">
            {message.emoji} {message.text}
          </div>
        </div>
      )}

      {/* Game Grid */}
      <div className="max-w-2xl mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {cards.map((card, index) => (
            <div
              key={`${card.pokemon.id}-${index}`}
              onClick={() => handleCardClick(index)}
              className={`
                relative aspect-square rounded-xl sm:rounded-2xl cursor-pointer
                transition-all duration-200 transform
                ${card.isClicked
                  ? card.isCorrect
                    ? "bg-green-100 border-4 border-green-500 scale-95"
                    : "bg-red-100 border-4 border-red-500 scale-95 opacity-60"
                  : "bg-white border-4 border-gray-200 hover:scale-105 hover:border-yellow-400 hover:shadow-lg active:scale-95"
                }
                shadow-md
              `}
            >
              <div className="absolute inset-1 sm:inset-2 flex items-center justify-center">
                <Image
                  src={card.pokemon.image}
                  alt={card.pokemon.name}
                  fill
                  className="object-contain p-1"
                  draggable={false}
                />
              </div>

              {/* Result overlay */}
              {card.isClicked && (
                <div
                  className={`absolute inset-0 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                    card.isCorrect ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  <span className="text-3xl sm:text-4xl drop-shadow-lg">
                    {card.isCorrect ? "✅" : "❌"}
                  </span>
                </div>
              )}

              {/* Pokemon name on hover (only if not clicked) */}
              {!card.isClicked && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] sm:text-xs text-center py-0.5 rounded-b-lg sm:rounded-b-xl opacity-0 hover:opacity-100 transition-opacity">
                  {card.pokemon.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start Overlay */}
      {gameState === "start" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-center max-w-md w-full shadow-2xl">
            <div className="text-5xl sm:text-6xl mb-4">⬆️</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-600 mb-2">
              Who Evolves?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              Ready, <span className="font-bold text-emerald-600">{playerName}</span>?
            </p>
            <div className="text-left bg-emerald-50 rounded-xl p-4 mb-6 text-sm sm:text-base">
              <p className="font-bold text-emerald-700 mb-2">How to Play:</p>
              <ul className="text-gray-600 space-y-1">
                <li>• Click Pokemon that CAN evolve</li>
                <li>• Build combos for bonus points!</li>
                <li>• Wrong clicks cost 2 seconds</li>
                <li>• Find all evolving Pokemon to win!</li>
              </ul>
            </div>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full font-bold text-xl hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Start Game!
            </button>
            {highScore > 0 && (
              <p className="mt-4 text-gray-500">
                Your best: <span className="font-bold text-emerald-600">{highScore}</span> points
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === "ended" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-center max-w-md w-full shadow-2xl">
            <div className="text-5xl sm:text-6xl mb-4">
              {correctFound === totalEvolvingInRound ? "🎉" : "⏳"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-600 mb-2">
              {correctFound === totalEvolvingInRound ? "You Found Them All!" : "Time's Up!"}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-2">
              {correctFound === totalEvolvingInRound
                ? `Amazing job, ${playerName}!`
                : `Good try, ${playerName}!`}
            </p>
            <div className="bg-emerald-50 rounded-xl p-4 mb-4">
              <p className="text-xl sm:text-2xl mb-2">
                You found <span className="font-bold text-emerald-600">{correctFound}</span> of{" "}
                <span className="font-bold text-emerald-600">{totalEvolvingInRound}</span> evolving Pokemon
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                Score: {score}
              </p>
              {score >= highScore && score > 0 && (
                <p className="text-lg text-yellow-600 font-bold mt-2 animate-pulse">
                  NEW HIGH SCORE!
                </p>
              )}
            </div>

            {/* Show missed evolving Pokemon */}
            {correctFound < totalEvolvingInRound && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">You missed:</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {cards
                    .filter((c) => c.canEvolve && !c.isClicked)
                    .map((c) => (
                      <div key={c.pokemon.id} className="w-10 h-10 sm:w-12 sm:h-12 relative">
                        <Image
                          src={c.pokemon.image}
                          alt={c.pokemon.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={startGame}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full font-bold text-xl hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Play Again!
            </button>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 text-center px-4">
        <p className="text-gray-500 text-xs sm:text-sm">
          Tip: Pokemon that can evolve have a next evolution stage. Final evolutions cannot evolve further!
        </p>
      </div>
    </div>
  );
}
