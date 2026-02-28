"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";

// First 152 Pokemon
const originalPokemon = pokemon.slice(0, 152);

// Commentary messages
const startMessages = [
  "Ready... Set... GO! 🏁",
  "And they're off! 🚀",
  "The race begins! ⚡",
  "Here we go! 💨",
];

const closeRaceMessages = [
  "It's neck and neck! 😱",
  "Too close to call! 🔥",
  "What a race! ⚡",
  "Neither giving up! 💪",
];

const winningMessages = [
  "You're pulling ahead! 🌟",
  "Amazing speed! 🏆",
  "Unstoppable! 💥",
  "Look at you go! 🚀",
];

const losingMessages = [
  "Don't give up! 💪",
  "Keep pressing! ⚡",
  "You can do it! 🔥",
  "Faster! Faster! 😤",
];

const victoryMessages = [
  "WINNER! You're a Pokemon Racing Champion! 🏆",
  "VICTORY! That was incredible! 🎉",
  "YOU WON! What amazing speed! ⭐",
  "CHAMPION! Nobody can catch you! 🥇",
];

const defeatMessages = [
  "So close! You'll get them next time! 💪",
  "Good race! Try again! 🌟",
  "Almost had it! One more try! ⚡",
  "That Pokemon was fast! Rematch? 🔥",
];

const getRandomMessage = (messages: string[]) => {
  return messages[Math.floor(Math.random() * messages.length)];
};

// Get a Pokemon for the opponent based on difficulty
const getOpponent = (raceNumber: number) => {
  // Pick random Pokemon, avoiding duplicates if possible
  return originalPokemon[Math.floor(Math.random() * originalPokemon.length)];
};

// Player's Pokemon choices
const playerPokemonChoices = [
  originalPokemon.find(p => p.name === "Pikachu") || originalPokemon[24],
  originalPokemon.find(p => p.name === "Charmander") || originalPokemon[3],
  originalPokemon.find(p => p.name === "Squirtle") || originalPokemon[6],
  originalPokemon.find(p => p.name === "Bulbasaur") || originalPokemon[0],
  originalPokemon.find(p => p.name === "Eevee") || originalPokemon[132],
];

export default function PokemonRacePage() {
  const [gameState, setGameState] = useState<"select" | "countdown" | "racing" | "finished">("select");
  const [playerPokemon, setPlayerPokemon] = useState(playerPokemonChoices[0]);
  const [opponent, setOpponent] = useState(originalPokemon[0]);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [opponentPosition, setOpponentPosition] = useState(0);
  const [lastKey, setLastKey] = useState<"left" | "right" | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [commentary, setCommentary] = useState("");
  const [raceNumber, setRaceNumber] = useState(1);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(0);
  const [opponentSpeed, setOpponentSpeed] = useState(0);
  const [dustParticles, setDustParticles] = useState<{ id: number; x: number; y: number; player: boolean }[]>([]);
  const [boostMeter, setBoostMeter] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const nextParticleId = useRef(0);
  const gameRef = useRef<HTMLDivElement>(null);

  const FINISH_LINE = 100;
  const BASE_OPPONENT_SPEED = 0.15;
  const DIFFICULTY_INCREASE = 0.02;

  // Select Pokemon and start race
  const selectPokemon = (poke: typeof originalPokemon[0]) => {
    setPlayerPokemon(poke);
    startNewRace();
  };

  // Start a new race
  const startNewRace = useCallback(() => {
    const newOpponent = getOpponent(raceNumber);
    setOpponent(newOpponent);
    setPlayerPosition(0);
    setOpponentPosition(0);
    setLastKey(null);
    setCountdown(3);
    setPlayerSpeed(0);
    setOpponentSpeed(0);
    setBoostMeter(0);
    setIsBoosting(false);
    setDustParticles([]);
    setGameState("countdown");
    setCommentary(`Race ${raceNumber}: You vs ${newOpponent.name}!`);
  }, [raceNumber]);

  // Countdown effect
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameState("racing");
      setCommentary(getRandomMessage(startMessages));
      gameRef.current?.focus();
    }
  }, [gameState, countdown]);

  // Opponent movement
  useEffect(() => {
    if (gameState !== "racing") return;

    const opponentTargetSpeed = BASE_OPPONENT_SPEED + (raceNumber - 1) * DIFFICULTY_INCREASE;

    const interval = setInterval(() => {
      // Opponent gradually reaches target speed with some variation
      setOpponentSpeed(prev => {
        const variation = (Math.random() - 0.5) * 0.05;
        return Math.min(opponentTargetSpeed + variation, prev + 0.01);
      });

      setOpponentPosition(prev => {
        const newPos = prev + opponentSpeed;

        // Add dust particles for opponent
        if (Math.random() > 0.7 && opponentSpeed > 0.1) {
          setDustParticles(particles => [
            ...particles.slice(-20),
            { id: nextParticleId.current++, x: newPos, y: 70, player: false }
          ]);
        }

        return Math.min(newPos, FINISH_LINE);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, opponentSpeed, raceNumber]);

  // Player speed decay and movement
  useEffect(() => {
    if (gameState !== "racing") return;

    const interval = setInterval(() => {
      // Speed decays over time
      setPlayerSpeed(prev => Math.max(0, prev - 0.008));

      // Boost meter fills when moving fast
      if (playerSpeed > 0.3) {
        setBoostMeter(prev => Math.min(100, prev + 2));
      }

      setPlayerPosition(prev => {
        const boost = isBoosting ? 1.5 : 1;
        const newPos = prev + (playerSpeed * boost);

        // Add dust particles
        if (Math.random() > 0.6 && playerSpeed > 0.15) {
          setDustParticles(particles => [
            ...particles.slice(-20),
            { id: nextParticleId.current++, x: newPos, y: 30, player: true }
          ]);
        }

        return Math.min(newPos, FINISH_LINE);
      });

      // Boost drains when active
      if (isBoosting) {
        setBoostMeter(prev => {
          if (prev <= 0) {
            setIsBoosting(false);
            return 0;
          }
          return prev - 3;
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, playerSpeed, isBoosting]);

  // Commentary updates
  useEffect(() => {
    if (gameState !== "racing") return;

    const interval = setInterval(() => {
      const diff = playerPosition - opponentPosition;

      if (Math.abs(diff) < 10) {
        setCommentary(getRandomMessage(closeRaceMessages));
      } else if (diff > 10) {
        setCommentary(getRandomMessage(winningMessages));
      } else {
        setCommentary(getRandomMessage(losingMessages));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameState, playerPosition, opponentPosition]);

  // Check for race finish
  useEffect(() => {
    if (gameState !== "racing") return;

    if (playerPosition >= FINISH_LINE || opponentPosition >= FINISH_LINE) {
      setGameState("finished");

      if (playerPosition >= opponentPosition) {
        setWins(w => w + 1);
        setCommentary(getRandomMessage(victoryMessages));
      } else {
        setLosses(l => l + 1);
        setCommentary(getRandomMessage(defeatMessages));
      }
    }
  }, [gameState, playerPosition, opponentPosition]);

  // Handle key press
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== "racing") return;

    // Activate boost with spacebar
    if (e.code === "Space" && boostMeter >= 50 && !isBoosting) {
      setIsBoosting(true);
      return;
    }

    // Alternate left/right for speed
    if (e.code === "ArrowLeft" && lastKey !== "left") {
      setLastKey("left");
      setPlayerSpeed(prev => Math.min(0.6, prev + 0.08));
    } else if (e.code === "ArrowRight" && lastKey !== "right") {
      setLastKey("right");
      setPlayerSpeed(prev => Math.min(0.6, prev + 0.08));
    }
  }, [gameState, lastKey, boostMeter, isBoosting]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus game
  useEffect(() => {
    gameRef.current?.focus();
  }, [gameState]);

  // Next race
  const nextRace = () => {
    setRaceNumber(r => r + 1);
    startNewRace();
  };

  // Restart from beginning
  const restart = () => {
    setRaceNumber(1);
    setWins(0);
    setLosses(0);
    setGameState("select");
  };

  const playerWon = playerPosition >= opponentPosition && gameState === "finished";

  return (
    <div
      ref={gameRef}
      className="min-h-screen bg-gradient-to-b from-green-400 via-green-500 to-green-600 outline-none overflow-hidden"
      tabIndex={0}
    >
      {/* Header */}
      <div className="bg-red-500 text-white p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-bold">Pokemon Race! 🏁</h1>
          <div className="flex gap-6 text-xl">
            <span>🏆 Wins: <b>{wins}</b></span>
            <span>Race: <b>{raceNumber}</b></span>
            <span>😢 Losses: <b>{losses}</b></span>
          </div>
        </div>
      </div>

      {/* Pokemon Selection */}
      {gameState === "select" && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-2xl text-center">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Racer!</h2>
            <p className="text-xl text-gray-600 mb-8">
              Press <kbd className="px-3 py-1 bg-gray-200 rounded font-bold">←</kbd> and{" "}
              <kbd className="px-3 py-1 bg-gray-200 rounded font-bold">→</kbd> alternately to run faster!
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {playerPokemonChoices.map((poke) => (
                <button
                  key={poke.id}
                  onClick={() => selectPokemon(poke)}
                  className="bg-gradient-to-b from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 p-4 rounded-2xl shadow-lg hover:scale-110 transition-transform"
                >
                  <Image
                    src={poke.image}
                    alt={poke.name}
                    width={100}
                    height={100}
                  />
                  <div className="font-bold text-gray-800 mt-2">{poke.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Race Track */}
      {gameState !== "select" && (
        <div className="max-w-6xl mx-auto p-6">
          {/* Commentary */}
          <div className="text-center mb-4">
            <div className="inline-block bg-white/90 backdrop-blur px-8 py-3 rounded-full shadow-lg">
              <span className="text-2xl font-bold text-gray-800">{commentary}</span>
            </div>
          </div>

          {/* Countdown */}
          {gameState === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30">
              <div className="text-[200px] font-bold text-white drop-shadow-lg animate-pulse">
                {countdown || "GO!"}
              </div>
            </div>
          )}

          {/* Speed & Boost Meters */}
          {gameState === "racing" && (
            <div className="flex justify-center gap-8 mb-4">
              <div className="bg-white/90 rounded-xl p-3 shadow-lg">
                <div className="text-sm text-gray-600 mb-1">Your Speed</div>
                <div className="w-40 h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                    style={{ width: `${(playerSpeed / 0.6) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bg-white/90 rounded-xl p-3 shadow-lg">
                <div className="text-sm text-gray-600 mb-1">Boost ⚡ (Space)</div>
                <div className="w-40 h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      boostMeter >= 50 ? "bg-gradient-to-r from-yellow-400 to-orange-500" : "bg-gray-400"
                    } ${isBoosting ? "animate-pulse" : ""}`}
                    style={{ width: `${boostMeter}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Race Track */}
          <div className="relative bg-gradient-to-b from-amber-200 via-amber-300 to-amber-200 rounded-3xl h-80 shadow-inner border-8 border-amber-600 overflow-hidden">
            {/* Track lines */}
            <div className="absolute inset-0">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-1 bg-white/30"
                  style={{ left: `${(i + 1) * 10}%` }}
                />
              ))}
            </div>

            {/* Start line */}
            <div className="absolute left-4 top-0 bottom-0 w-3 bg-white" />

            {/* Finish line */}
            <div className="absolute right-4 top-0 bottom-0 w-6 bg-gradient-to-b from-black via-white to-black bg-[length:100%_20px]" />
            <div className="absolute right-2 top-2 text-2xl">🏁</div>

            {/* Lane divider */}
            <div className="absolute left-0 right-0 top-1/2 h-2 bg-white/50 -translate-y-1/2" style={{ backgroundImage: "repeating-linear-gradient(90deg, white 0px, white 20px, transparent 20px, transparent 40px)" }} />

            {/* Dust particles */}
            {dustParticles.map(particle => (
              <div
                key={particle.id}
                className={`absolute w-4 h-4 rounded-full ${particle.player ? "bg-yellow-300" : "bg-gray-400"} opacity-50 animate-ping`}
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                }}
              />
            ))}

            {/* Player Pokemon (top lane) */}
            <div
              className={`absolute top-8 transition-all duration-100 ${isBoosting ? "animate-pulse scale-110" : ""}`}
              style={{ left: `${Math.min(playerPosition, 90)}%` }}
            >
              <div className="relative">
                <Image
                  src={playerPokemon.image}
                  alt={playerPokemon.name}
                  width={100}
                  height={100}
                  className={`drop-shadow-lg ${playerSpeed > 0.3 ? "animate-bounce" : ""}`}
                  style={{ transform: "scaleX(-1)" }}
                />
                {isBoosting && (
                  <div className="absolute -left-4 top-1/2 text-3xl">🔥</div>
                )}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  {playerPokemon.name} (You)
                </div>
              </div>
            </div>

            {/* Opponent Pokemon (bottom lane) */}
            <div
              className="absolute bottom-8 transition-all duration-100"
              style={{ left: `${Math.min(opponentPosition, 90)}%` }}
            >
              <div className="relative">
                <Image
                  src={opponent.image}
                  alt={opponent.name}
                  width={100}
                  height={100}
                  className={`drop-shadow-lg ${opponentSpeed > 0.15 ? "animate-bounce" : ""}`}
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  {opponent.name}
                </div>
              </div>
            </div>

            {/* Position markers */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm">
              {Math.round(playerPosition)}% vs {Math.round(opponentPosition)}%
            </div>
          </div>

          {/* Controls hint */}
          {gameState === "racing" && (
            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-4 bg-white/90 px-8 py-4 rounded-2xl shadow-lg">
                <kbd className={`px-6 py-3 rounded-xl text-3xl font-bold transition-all ${lastKey === "left" ? "bg-blue-500 text-white scale-110" : "bg-gray-200"}`}>
                  ←
                </kbd>
                <span className="text-2xl text-gray-600">alternate</span>
                <kbd className={`px-6 py-3 rounded-xl text-3xl font-bold transition-all ${lastKey === "right" ? "bg-blue-500 text-white scale-110" : "bg-gray-200"}`}>
                  →
                </kbd>
                {boostMeter >= 50 && (
                  <span className="ml-4 text-xl text-orange-500 font-bold animate-pulse">
                    ⚡ SPACE for BOOST!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Finish screen */}
          {gameState === "finished" && (
            <div className="fixed inset-0 flex items-center justify-center z-40 bg-black/50">
              <div className={`text-center p-10 rounded-3xl shadow-2xl max-w-lg ${playerWon ? "bg-gradient-to-b from-yellow-300 to-yellow-400" : "bg-white"}`}>
                <div className="text-8xl mb-4">{playerWon ? "🏆" : "😢"}</div>
                <div className="text-4xl font-bold text-gray-800 mb-4">
                  {commentary}
                </div>
                <div className="text-xl text-gray-600 mb-6">
                  {playerWon
                    ? `You beat ${opponent.name}! Opponents get faster!`
                    : `${opponent.name} was too fast this time!`}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={nextRace}
                    className="bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-4 px-8 rounded-full text-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    {playerWon ? "Next Race! 🏁" : "Try Again! 💪"}
                  </button>
                  <button
                    onClick={restart}
                    className="bg-gray-200 text-gray-700 font-bold py-4 px-8 rounded-full text-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    Change Pokemon
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
