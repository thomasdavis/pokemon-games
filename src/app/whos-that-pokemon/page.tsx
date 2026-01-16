"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { click, success, error, win, whoosh } from "@/lib/sounds";
import { announcePokemon, sayCorrect, sayWrong, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

type LetterDifficulty = "easy" | "medium" | "hard";
type ImageDifficulty = "easy" | "medium" | "hard";

const LETTER_SETTINGS = {
  easy: { revealPercent: 1.0, label: "Easy", description: "Full names", color: "bg-green-500" },
  medium: { revealPercent: 0.5, label: "Medium", description: "50% letters", color: "bg-yellow-500" },
  hard: { revealPercent: 0.3, label: "Hard", description: "30% letters", color: "bg-red-500" },
};

const IMAGE_SETTINGS = {
  easy: { tiles: 1, label: "Easy", description: "Normal image", color: "bg-green-500" },
  medium: { tiles: 4, label: "Medium", description: "4 tiles", color: "bg-yellow-500" },
  hard: { tiles: 16, label: "Hard", description: "16 tiles", color: "bg-red-500" },
};

function maskName(name: string, revealPercent: number): string {
  if (revealPercent >= 1) return name;

  const chars = name.split("");
  const letterIndices: number[] = [];

  chars.forEach((char, index) => {
    if (/[a-zA-Z]/.test(char)) {
      letterIndices.push(index);
    }
  });

  const numToReveal = Math.max(1, Math.ceil(letterIndices.length * revealPercent));
  const shuffledIndices = [...letterIndices].sort(() => Math.random() - 0.5);
  const revealIndices = new Set(shuffledIndices.slice(0, numToReveal));

  return chars
    .map((char, index) => {
      if (/[a-zA-Z]/.test(char)) {
        return revealIndices.has(index) ? char : "_";
      }
      return char;
    })
    .join(" ");
}

function generateTileOrder(numTiles: number): number[] {
  const order = Array.from({ length: numTiles }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

interface ScrambledImageProps {
  src: string;
  tiles: number;
  tileOrder: number[];
  revealed: boolean;
  size: number;
}

function ScrambledImage({ src, tiles, tileOrder, revealed, size }: ScrambledImageProps) {
  const gridSize = Math.sqrt(tiles);
  const tileSize = size / gridSize;

  if (tiles === 1 || revealed) {
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <Image
          src={src}
          alt=""
          fill
          className={`object-contain transition-all duration-500 ${
            revealed ? "" : "brightness-0"
          }`}
          style={{ filter: revealed ? "none" : "brightness(0)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto grid gap-1 bg-blue-500/30 p-1 rounded-lg"
      style={{
        width: size + (gridSize - 1) * 4 + 8,
        height: size + (gridSize - 1) * 4 + 8,
        gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${gridSize}, ${tileSize}px)`,
      }}
    >
      {tileOrder.map((originalIndex, displayIndex) => {
        const originalRow = Math.floor(originalIndex / gridSize);
        const originalCol = originalIndex % gridSize;

        return (
          <div
            key={displayIndex}
            className="relative overflow-hidden bg-blue-600 rounded"
            style={{ width: tileSize, height: tileSize }}
          >
            <div
              className="absolute brightness-0"
              style={{
                width: size,
                height: size,
                left: -originalCol * tileSize,
                top: -originalRow * tileSize,
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-contain"
                style={{ filter: "brightness(0)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WhosThatPokemonPage() {
  const { name: playerName } = usePlayer();
  const [letterDifficulty, setLetterDifficulty] = useState<LetterDifficulty>("easy");
  const [imageDifficulty, setImageDifficulty] = useState<ImageDifficulty>("easy");
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [options, setOptions] = useState<Pokemon[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [maskedNames, setMaskedNames] = useState<Map<number, string>>(new Map());
  const [tileOrder, setTileOrder] = useState<number[]>([0]);
  const [personalizedMessage, setPersonalizedMessage] = useState<{ message: string; emoji: string } | null>(null);

  const generateRound = useCallback(() => {
    const shuffled = [...pokemon].sort(() => Math.random() - 0.5);
    const answer = shuffled[0];
    const wrongAnswers = shuffled.slice(1, 4);
    const allOptions = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    const revealPercent = LETTER_SETTINGS[letterDifficulty].revealPercent;
    const newMaskedNames = new Map<number, string>();
    allOptions.forEach((p) => {
      newMaskedNames.set(p.id, maskName(p.name, revealPercent));
    });

    const numTiles = IMAGE_SETTINGS[imageDifficulty].tiles;
    const newTileOrder = generateTileOrder(numTiles);

    setCurrentPokemon(answer);
    setOptions(allOptions);
    setMaskedNames(newMaskedNames);
    setTileOrder(newTileOrder);
    setRevealed(false);
    setMessage("");
    setIsCorrect(null);
  }, [letterDifficulty, imageDifficulty]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleGuess = (guess: Pokemon) => {
    if (revealed) return;

    // Play click sound when selecting an answer
    click();

    setRevealed(true);

    // Play whoosh sound when revealing the Pokemon
    whoosh();

    const letterMultiplier = letterDifficulty === "hard" ? 3 : letterDifficulty === "medium" ? 2 : 1;
    const imageMultiplier = imageDifficulty === "hard" ? 3 : imageDifficulty === "medium" ? 2 : 1;
    const totalMultiplier = letterMultiplier + imageMultiplier - 1;

    if (guess.id === currentPokemon?.id) {
      setIsCorrect(true);
      const newStreak = streak + 1;
      setScore((s) => s + (10 + streak * 5) * totalMultiplier);
      setStreak(newStreak);
      setMessage(`Yes! It's ${currentPokemon.name}!`);

      // Play success sound and speech
      success();
      sayCorrect();
      announcePokemon(currentPokemon.name);

      // Check for streak achievements
      if (newStreak >= 3 && newStreak % 3 === 0) {
        // Play win sound and celebrate for streak milestones
        setTimeout(() => {
          win();
          celebrateWin();
        }, 500);
        const streakMsg = getQuickPersonalizedMessage(playerName, 'streak', { streak: newStreak });
        setPersonalizedMessage(streakMsg);
      } else {
        const correctMsg = getQuickPersonalizedMessage(playerName, 'correct_answer');
        setPersonalizedMessage(correctMsg);
      }
    } else {
      setIsCorrect(false);
      setStreak(0);
      setMessage(`Nope! It's ${currentPokemon?.name}!`);

      // Play error sound and speech
      error();
      sayWrong();
      announcePokemon(currentPokemon?.name || '');

      const wrongMsg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
      setPersonalizedMessage(wrongMsg);
    }
  };

  const handleNext = () => {
    setPersonalizedMessage(null);
    generateRound();
  };

  const getDisplayName = (option: Pokemon): string => {
    if (revealed) return option.name;
    return maskedNames.get(option.id) || option.name;
  };

  const resetScore = () => {
    setScore(0);
    setStreak(0);
  };

  return (
    <div className="py-8">
      {/* Player Name Display */}
      <div className="text-center mb-4">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg font-semibold text-yellow-800 shadow">
          Player: {playerName}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-center text-green-600 mb-6">
        Who&apos;s That Pokemon?
      </h1>

      {/* Settings Panel */}
      <div className="max-w-2xl mx-auto mb-6 bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-4 text-center">Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Letter Difficulty */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Letter Hints</h3>
            <div className="flex justify-center gap-2">
              {(Object.keys(LETTER_SETTINGS) as LetterDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setLetterDifficulty(d);
                    resetScore();
                  }}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                    letterDifficulty === d
                      ? `${LETTER_SETTINGS[d].color} text-white scale-105 shadow-md`
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  {LETTER_SETTINGS[d].label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {LETTER_SETTINGS[letterDifficulty].description}
            </p>
          </div>

          {/* Image Difficulty */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Image Scramble</h3>
            <div className="flex justify-center gap-2">
              {(Object.keys(IMAGE_SETTINGS) as ImageDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setImageDifficulty(d);
                    resetScore();
                  }}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                    imageDifficulty === d
                      ? `${IMAGE_SETTINGS[d].color} text-white scale-105 shadow-md`
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  {IMAGE_SETTINGS[d].label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {IMAGE_SETTINGS[imageDifficulty].description}
            </p>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex justify-center gap-8 text-xl mb-6">
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Score: <span className="font-bold text-green-600">{score}</span>
        </span>
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Streak: <span className="font-bold text-orange-500">{streak}</span> 🔥
        </span>
      </div>

      {currentPokemon && (
        <div className="max-w-2xl mx-auto">
          {/* Pokemon Display */}
          <div className="bg-gradient-to-b from-blue-400 to-blue-600 rounded-3xl p-8 mb-8 shadow-xl">
            <ScrambledImage
              src={currentPokemon.image}
              tiles={IMAGE_SETTINGS[imageDifficulty].tiles}
              tileOrder={tileOrder}
              revealed={revealed}
              size={256}
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-center text-3xl font-bold mb-4 ${
                isCorrect ? "text-green-600" : "text-red-500"
              } animate-pop`}
            >
              {message}
            </div>
          )}

          {/* Personalized Message */}
          {personalizedMessage && (
            <div className="text-center text-xl mb-6 animate-bounce">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-2 rounded-full shadow-md">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleGuess(option)}
                disabled={revealed}
                className={`p-6 rounded-2xl font-bold transition-all ${
                  revealed
                    ? option.id === currentPokemon.id
                      ? "bg-green-500 text-white scale-105"
                      : "bg-gray-300 text-gray-500"
                    : "bg-white hover:bg-yellow-100 hover:scale-105 shadow-lg border-4 border-transparent hover:border-yellow-400"
                } ${letterDifficulty !== "easy" && !revealed ? "font-mono text-lg tracking-wider" : "text-xl"}`}
              >
                {getDisplayName(option)}
              </button>
            ))}
          </div>

          {/* Next Button */}
          {revealed && (
            <div className="text-center mt-8">
              <button
                onClick={handleNext}
                className="bg-green-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg"
              >
                Next Pokemon! →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
