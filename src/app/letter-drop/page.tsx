"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon } from "@/data/pokemon";

// Fun messages for correct answers
const correctMessages = [
  "You're a Pokemon Master in training! 🌟",
  "Incredible aim! Bullseye! 🎯",
  "Your timing is legendary! ⚡",
  "Wow! You caught it perfectly! 🎉",
  "Amazing! That was super effective! 💥",
  "You've got the skills of a Champion! 🏆",
  "Fantastic! Keep up the great work! ✨",
  "Brilliant! You're on fire! 🔥",
  "Perfect drop! You're unstoppable! 🚀",
  "Yes! That's how it's done! 👏",
  "Superstar trainer alert! ⭐",
  "You make it look so easy! 😎",
  "Boom! Nailed it! 💫",
  "Outstanding! Professor Oak is proud! 🎓",
  "Epic catch! You're crushing it! 🎮",
];

// Fun messages for wrong answers
const wrongMessages = [
  "Oops! Almost had it! Try again! 💪",
  "So close! You'll get the next one! 🌈",
  "Don't worry, even Ash misses sometimes! 😊",
  "Keep going! Practice makes perfect! ⭐",
  "Almost! Timing is tricky! ⏰",
  "Good try! The next one is yours! 🎯",
  "No worries! Every trainer learns! 📚",
  "You're getting better! Keep it up! 💫",
  "That was close! Stay focused! 👀",
  "Shake it off! Here comes another! 🎮",
  "Nice try! You've got this! 💪",
  "Oopsie! But you're still awesome! 🌟",
  "Miss! But champions never give up! 🏆",
  "So close! Watch the ball carefully! 👁️",
  "Don't give up! Believe in yourself! ✨",
];

const getRandomMessage = (isCorrect: boolean) => {
  const messages = isCorrect ? correctMessages : wrongMessages;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Only use the first 150 Pokemon
const originalPokemon = pokemon.slice(0, 150);

// Get unique first letters from Pokemon names
const allFirstLetters = [...new Set(originalPokemon.map(p => p.name[0].toUpperCase()))];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Get a random Pokemon that starts with a specific letter
function getPokemonStartingWith(letter: string): typeof originalPokemon[0] | null {
  const matching = originalPokemon.filter(p => p.name[0].toUpperCase() === letter);
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

// Get 4 letters including the correct one
function getLetterOptions(correctLetter: string): string[] {
  const otherLetters = allFirstLetters.filter(l => l !== correctLetter);
  const shuffledOthers = shuffleArray(otherLetters).slice(0, 3);
  const options = [correctLetter, ...shuffledOthers];
  return shuffleArray(options);
}

export default function LetterDropPage() {
  const [currentPokemon, setCurrentPokemon] = useState(originalPokemon[0]);
  const [letterOptions, setLetterOptions] = useState<string[]>([]);
  const [bucketPokemon, setBucketPokemon] = useState<(typeof originalPokemon[0] | null)[]>([]);
  const [ballPosition, setBallPosition] = useState(50);
  const [ballDirection, setBallDirection] = useState(1);
  const [ballDropping, setBallDropping] = useState(false);
  const [ballY, setBallY] = useState(0);
  const [targetBucket, setTargetBucket] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speed, setSpeed] = useState(0.8); // Much slower starting speed
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const gameRef = useRef<HTMLDivElement>(null);

  // Initialize game
  const initializeRound = useCallback(() => {
    const newPokemon = originalPokemon[Math.floor(Math.random() * originalPokemon.length)];
    const correctLetter = newPokemon.name[0].toUpperCase();
    const options = getLetterOptions(correctLetter);

    // For the correct letter bucket, use the actual Pokemon being guessed
    // For other buckets, use a random Pokemon starting with that letter
    const bucketMons = options.map(letter => {
      if (letter === correctLetter) {
        return newPokemon; // Use the actual Pokemon for the correct bucket
      }
      return getPokemonStartingWith(letter);
    });

    setCurrentPokemon(newPokemon);
    setLetterOptions(options);
    setBucketPokemon(bucketMons);
    setBallDropping(false);
    setBallY(0);
    setTargetBucket(null);
    setResult(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    initializeRound();
  }, [initializeRound]);

  // Ball horizontal movement - SLOWER
  useEffect(() => {
    if (ballDropping || showResult) return;

    const interval = setInterval(() => {
      setBallPosition(prev => {
        const newPos = prev + (ballDirection * speed);
        if (newPos >= 92) {
          setBallDirection(-1);
          return 92;
        }
        if (newPos <= 8) {
          setBallDirection(1);
          return 8;
        }
        return newPos;
      });
    }, 30); // Slower interval

    return () => clearInterval(interval);
  }, [ballDirection, ballDropping, speed, showResult]);

  // Ball dropping animation
  useEffect(() => {
    if (!ballDropping) return;

    const interval = setInterval(() => {
      setBallY(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [ballDropping]);

  // Check result when ball lands
  useEffect(() => {
    if (ballY >= 100 && targetBucket !== null && !showResult) {
      setShowResult(true);
      const correctLetter = currentPokemon.name[0].toUpperCase();
      const selectedLetter = letterOptions[targetBucket];
      const isCorrect = selectedLetter === correctLetter;

      setResult(isCorrect ? "correct" : "wrong");
      setResultMessage(getRandomMessage(isCorrect));
      setTotalAttempts(prev => prev + 1);

      if (isCorrect) {
        setScore(prev => prev + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        // Slight speed increase on streaks
        if (newStreak % 5 === 0) {
          setSpeed(prev => Math.min(prev + 0.2, 2));
        }
      } else {
        setStreak(0);
        setSpeed(0.8);
      }
    }
  }, [ballY, targetBucket, letterOptions, currentPokemon, showResult, streak, bestStreak]);

  // Auto-advance to next Pokemon after 1 second
  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        initializeRound();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showResult, initializeRound]);

  // Handle key press
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (ballDropping || showResult) return;

    const key = e.key.toUpperCase();
    const bucketIndex = letterOptions.findIndex(l => l === key);

    if (bucketIndex !== -1) {
      const bucketWidth = 100 / 4;
      const landingBucket = Math.min(3, Math.floor(ballPosition / bucketWidth));
      setTargetBucket(landingBucket);
      setBallDropping(true);
    }
  }, [ballDropping, showResult, letterOptions, ballPosition]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    gameRef.current?.focus();
  }, []);

  const correctLetter = currentPokemon.name[0].toUpperCase();
  const accuracy = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0;

  return (
    <div
      ref={gameRef}
      className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black p-6 outline-none"
      tabIndex={0}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2">
            Letter Drop! 🎯
          </h1>
          <p className="text-2xl text-purple-300">Press the letter key to drop the ball!</p>
        </div>

        {/* Score Board - BIGGER */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-center">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="text-5xl font-bold text-green-400">{score}</div>
            <div className="text-lg text-gray-400">Score</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="text-5xl font-bold text-yellow-400">{streak}</div>
            <div className="text-lg text-gray-400">Streak</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="text-5xl font-bold text-purple-400">{bestStreak}</div>
            <div className="text-lg text-gray-400">Best</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="text-5xl font-bold text-blue-400">{accuracy}%</div>
            <div className="text-lg text-gray-400">Accuracy</div>
          </div>
        </div>

        {/* Pokemon Display - BIGGER */}
        <div className="text-center mb-6">
          <div className="inline-block bg-white/10 backdrop-blur rounded-3xl p-6">
            <Image
              src={currentPokemon.image}
              alt={currentPokemon.name}
              width={180}
              height={180}
              className="mx-auto"
              priority
            />
            <div className="text-4xl font-bold text-white mt-3">
              {currentPokemon.name}
            </div>
            <div className="text-2xl text-yellow-300 mt-2">
              Starts with: <span className="text-5xl font-bold">{correctLetter}</span>
            </div>
          </div>
        </div>

        {/* Game Area - BIGGER */}
        <div className="relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl h-96 overflow-hidden border-4 border-purple-500">
          {/* Ball - BIGGER */}
          <div
            className="absolute w-14 h-14 transition-none"
            style={{
              left: `calc(${ballPosition}% - 28px)`,
              top: `calc(${ballY * 0.65}% - 28px)`,
            }}
          >
            <div className={`w-full h-full rounded-full border-4 border-white shadow-2xl ${
              result === "correct"
                ? "bg-gradient-to-br from-green-400 to-green-600"
                : result === "wrong"
                ? "bg-gradient-to-br from-gray-500 to-gray-700"
                : "bg-gradient-to-br from-red-500 to-red-700"
            }`}>
              <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-900 -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-900"></div>
            </div>
          </div>

          {/* Result Overlay */}
          {showResult && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className={`text-center p-8 rounded-3xl max-w-lg ${
                result === "correct" ? "bg-green-500/90" : "bg-red-500/90"
              }`}>
                <div className="text-7xl mb-4">
                  {result === "correct" ? "🎉" : "😅"}
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {resultMessage}
                </div>
                {result === "wrong" && (
                  <div className="text-xl text-white/90 mt-2">
                    The answer was <span className="font-bold text-yellow-300 text-2xl">{correctLetter}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buckets - BIGGER */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {letterOptions.map((letter, index) => {
              const isTarget = showResult && targetBucket === index;
              const isCorrectBucket = letter === correctLetter;

              return (
                <div
                  key={index}
                  className={`flex-1 h-44 border-t-8 border-x-4 first:border-l-8 last:border-r-8 flex flex-col items-center justify-end pb-3 transition-colors ${
                    isTarget && result === "correct"
                      ? "bg-green-500/50 border-green-400"
                      : isTarget && result === "wrong"
                      ? "bg-red-500/50 border-red-400"
                      : showResult && isCorrectBucket
                      ? "bg-yellow-500/30 border-yellow-400"
                      : "bg-gray-800/50 border-purple-400"
                  }`}
                >
                  {/* Silhouette Pokemon - BIGGER */}
                  {bucketPokemon[index] && (
                    <Image
                      src={bucketPokemon[index]!.image}
                      alt=""
                      width={80}
                      height={80}
                      className={`${
                        showResult && isCorrectBucket ? "brightness-100 opacity-100" : "brightness-0 opacity-50"
                      }`}
                    />
                  )}
                  {/* Letter - BIGGER */}
                  <div className={`text-5xl font-bold mt-2 ${
                    showResult && isCorrectBucket ? "text-yellow-300" : "text-white"
                  }`}>
                    {letter}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions - BIGGER */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
          <div className="text-2xl text-white mb-4">
            <span className="text-yellow-300 font-bold">Press any letter key</span> to drop the ball!
          </div>
          <div className="flex justify-center gap-6">
            {letterOptions.map(letter => (
              <kbd
                key={letter}
                className="px-8 py-4 bg-gray-800 text-white rounded-xl font-mono text-4xl border-b-8 border-gray-600 hover:border-purple-400 transition-colors shadow-lg"
              >
                {letter}
              </kbd>
            ))}
          </div>
          <p className="text-purple-300 text-xl mt-4">
            Time it right so the ball lands in the <span className="text-yellow-300 font-bold text-2xl">{correctLetter}</span> bucket!
          </p>
        </div>
      </div>
    </div>
  );
}
