"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

type GamePhase = "setup" | "study" | "answer" | "result";
type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_SETTINGS: Record<Difficulty, { time: number; label: string; points: number }> = {
  easy: { time: 5, label: "Easy (5s)", points: 10 },
  medium: { time: 3, label: "Medium (3s)", points: 20 },
  hard: { time: 1.5, label: "Hard (1.5s)", points: 30 },
};

const GRID_SIZE = 12;
const OPTIONS_COUNT = 6;

export default function WhosMissingPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [studyPokemon, setStudyPokemon] = useState<Pokemon[]>([]);
  const [missingPokemon, setMissingPokemon] = useState<Pokemon | null>(null);
  const [optionsPokemon, setOptionsPokemon] = useState<Pokemon[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<Pokemon | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownSoundRef = useRef<HTMLAudioElement | null>(null);
  const { name: playerName } = usePlayer();

  // Preload images for current round
  const preloadImages = useCallback((pokemonList: Pokemon[]): Promise<void> => {
    return new Promise((resolve) => {
      let loaded = 0;
      const total = pokemonList.length;

      if (total === 0) {
        resolve();
        return;
      }

      pokemonList.forEach((p) => {
        const img = new window.Image();
        img.onload = () => {
          loaded++;
          if (loaded === total) {
            resolve();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === total) {
            resolve();
          }
        };
        img.src = p.image;
      });

      // Timeout fallback
      setTimeout(resolve, 3000);
    });
  }, []);

  // Start a new round
  const startRound = useCallback(async () => {
    setImagesLoaded(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFeedbackMessage(null);
    setFadeOut(false);

    // Select 12 random Pokemon
    const shuffled = [...pokemon].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, GRID_SIZE);

    // Pick one to be the missing Pokemon
    const missingIndex = Math.floor(Math.random() * GRID_SIZE);
    const missing = selected[missingIndex];

    // Create options: the missing one + 5 random others
    const otherOptions = shuffled
      .slice(GRID_SIZE, GRID_SIZE + 50)
      .filter((p) => p.id !== missing.id)
      .slice(0, OPTIONS_COUNT - 1);
    const allOptions = [missing, ...otherOptions].sort(() => Math.random() - 0.5);

    setStudyPokemon(selected);
    setMissingPokemon(missing);
    setOptionsPokemon(allOptions);

    // Preload all images
    await preloadImages([...selected, ...allOptions]);
    setImagesLoaded(true);

    // Start study phase
    setPhase("study");
    speak("Study these Pokemon!");

    const studyTime = DIFFICULTY_SETTINGS[difficulty].time;
    setTimeLeft(studyTime);

    // Play countdown sound
    countdownSoundRef.current = playSound("countdown", { loop: true, volume: 0.3 });

    // Timer countdown
    const startTime = Date.now();
    const endTime = startTime + studyTime * 1000;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, (endTime - Date.now()) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (countdownSoundRef.current) {
          countdownSoundRef.current.pause();
          countdownSoundRef.current = null;
        }

        // Fade out transition
        setFadeOut(true);
        setTimeout(() => {
          setPhase("answer");
          speak("Which one is missing?");
        }, 500);
      }
    }, 50);
  }, [difficulty, preloadImages]);

  // Start game
  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setRound(1);
    startRound();
  }, [startRound]);

  // Handle answer selection
  const handleSelectAnswer = (selected: Pokemon) => {
    if (phase !== "answer" || selectedAnswer) return;

    playSound("click");
    setSelectedAnswer(selected);

    const correct = selected.id === missingPokemon?.id;
    setIsCorrect(correct);
    setPhase("result");

    if (correct) {
      const basePoints = DIFFICULTY_SETTINGS[difficulty].points;
      const streakBonus = streak * 5;
      const earnedPoints = basePoints + streakBonus;

      setScore((prev) => prev + earnedPoints);
      setStreak((prev) => prev + 1);
      playSound("success");
      const msg = getQuickPersonalizedMessage(playerName, "correct_answer");
      setFeedbackMessage(msg);
    } else {
      setStreak(0);
      playSound("error");
      const msg = getQuickPersonalizedMessage(playerName, "wrong_answer");
      setFeedbackMessage(msg);
    }
  };

  // Next round
  const handleNextRound = () => {
    setRound((prev) => prev + 1);
    startRound();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (countdownSoundRef.current) {
        countdownSoundRef.current.pause();
      }
    };
  }, []);

  // Render setup screen
  if (phase === "setup") {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
          Who&apos;s Missing?
        </h1>

        <p className="text-center text-lg text-gray-600 mb-8">
          Welcome, <span className="font-bold text-indigo-600">{playerName}</span>!
        </p>

        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-4">How to Play</h2>
          <p className="text-lg text-gray-600 mb-6">
            Study 12 Pokemon, then one will disappear. Can you figure out which one is missing?
          </p>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Select Difficulty</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-6 py-3 rounded-full font-bold transition-all ${
                    difficulty === d
                      ? "bg-indigo-600 text-white scale-110 shadow-lg"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  {DIFFICULTY_SETTINGS[d].label}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {DIFFICULTY_SETTINGS[difficulty].points} points per correct answer
            </p>
          </div>

          <button
            onClick={startGame}
            className="bg-indigo-600 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
          >
            Start Game!
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!imagesLoaded) {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
          Who&apos;s Missing?
        </h1>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xl text-gray-600">Loading Pokemon...</p>
        </div>
      </div>
    );
  }

  // Study phase
  if (phase === "study") {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
          Who&apos;s Missing?
        </h1>

        {/* Score and round info */}
        <div className="flex justify-center gap-6 mb-4 flex-wrap">
          <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
            Round: <span className="font-bold text-indigo-600">{round}</span>
          </span>
          <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
            Score: <span className="font-bold text-green-600">{score}</span>
          </span>
          {streak > 0 && (
            <span className="bg-yellow-100 px-4 py-2 rounded-full shadow text-lg">
              Streak: <span className="font-bold text-orange-600">{streak}</span> 🔥
            </span>
          )}
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-full text-2xl font-bold">
            Study! {timeLeft.toFixed(1)}s
          </div>
        </div>

        {/* Pokemon grid */}
        <div
          className={`grid grid-cols-4 gap-3 max-w-2xl mx-auto transition-opacity duration-500 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
        >
          {studyPokemon.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-3 shadow-lg flex flex-col items-center"
            >
              <Image
                src={p.image}
                alt={p.name}
                width={80}
                height={80}
                className="pixelated"
              />
              <span className="text-sm font-medium text-gray-700 truncate w-full text-center">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Answer phase
  if (phase === "answer") {
    // Remove the missing Pokemon from display
    const remainingPokemon = studyPokemon.filter((p) => p.id !== missingPokemon?.id);

    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
          Who&apos;s Missing?
        </h1>

        {/* Score and round info */}
        <div className="flex justify-center gap-6 mb-4 flex-wrap">
          <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
            Round: <span className="font-bold text-indigo-600">{round}</span>
          </span>
          <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
            Score: <span className="font-bold text-green-600">{score}</span>
          </span>
          {streak > 0 && (
            <span className="bg-yellow-100 px-4 py-2 rounded-full shadow text-lg">
              Streak: <span className="font-bold text-orange-600">{streak}</span> 🔥
            </span>
          )}
        </div>

        {/* Prompt */}
        <div className="text-center mb-6">
          <div className="inline-block bg-red-500 text-white px-8 py-3 rounded-full text-2xl font-bold animate-pulse">
            Which Pokemon is missing?
          </div>
        </div>

        {/* Remaining Pokemon grid (11 Pokemon with one empty slot) */}
        <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto mb-8">
          {remainingPokemon.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-3 shadow-lg flex flex-col items-center opacity-70"
            >
              <Image
                src={p.image}
                alt={p.name}
                width={80}
                height={80}
                className="pixelated grayscale"
              />
              <span className="text-sm font-medium text-gray-500 truncate w-full text-center">
                {p.name}
              </span>
            </div>
          ))}
          {/* Empty slot indicator */}
          <div className="bg-gray-200 rounded-2xl p-3 shadow-lg flex flex-col items-center justify-center border-4 border-dashed border-red-400">
            <span className="text-4xl">❓</span>
            <span className="text-sm font-bold text-red-500">Missing!</span>
          </div>
        </div>

        {/* Answer options */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-center text-xl font-bold mb-4 text-gray-700">
            Select the missing Pokemon:
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {optionsPokemon.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectAnswer(p)}
                className="bg-white rounded-2xl p-4 shadow-lg flex flex-col items-center hover:bg-indigo-50 hover:scale-105 transition-all border-4 border-transparent hover:border-indigo-400"
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  width={80}
                  height={80}
                  className="pixelated"
                />
                <span className="text-lg font-bold text-gray-800">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result phase
  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4">
        Who&apos;s Missing?
      </h1>

      {/* Score and round info */}
      <div className="flex justify-center gap-6 mb-8 flex-wrap">
        <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
          Round: <span className="font-bold text-indigo-600">{round}</span>
        </span>
        <span className="bg-white px-4 py-2 rounded-full shadow text-lg">
          Score: <span className="font-bold text-green-600">{score}</span>
        </span>
        {streak > 0 && (
          <span className="bg-yellow-100 px-4 py-2 rounded-full shadow text-lg">
            Streak: <span className="font-bold text-orange-600">{streak}</span> 🔥
          </span>
        )}
      </div>

      {/* Result card */}
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
        <div className={`text-6xl mb-4 ${isCorrect ? "animate-bounce" : ""}`}>
          {isCorrect ? "🎉" : "😢"}
        </div>

        <h2
          className={`text-3xl font-bold mb-2 ${
            isCorrect ? "text-green-600" : "text-red-500"
          }`}
        >
          {isCorrect ? "Correct!" : "Not quite!"}
        </h2>

        {/* Personalized feedback */}
        {feedbackMessage && (
          <div className="bg-yellow-100 rounded-2xl p-4 mb-4 inline-block">
            <span className="text-2xl mr-2">{feedbackMessage.emoji}</span>
            <span className="text-xl font-medium">{feedbackMessage.message}</span>
          </div>
        )}

        {/* Show the missing Pokemon */}
        <div className="my-6">
          <p className="text-lg text-gray-600 mb-2">The missing Pokemon was:</p>
          <div className="inline-block bg-indigo-50 rounded-2xl p-4 border-4 border-indigo-400">
            <Image
              src={missingPokemon?.image || ""}
              alt={missingPokemon?.name || ""}
              width={120}
              height={120}
              className="mx-auto pixelated"
            />
            <p className="text-2xl font-bold text-indigo-600">{missingPokemon?.name}</p>
          </div>
        </div>

        {/* Show what was selected if wrong */}
        {!isCorrect && selectedAnswer && (
          <p className="text-gray-600 mb-4">
            You selected: <span className="font-bold">{selectedAnswer.name}</span>
          </p>
        )}

        {/* Points earned */}
        {isCorrect && (
          <p className="text-lg text-gray-600 mb-4">
            +{DIFFICULTY_SETTINGS[difficulty].points + (streak > 1 ? (streak - 1) * 5 : 0)} points
            {streak > 1 && (
              <span className="text-orange-500"> (includes streak bonus!)</span>
            )}
          </p>
        )}

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={handleNextRound}
            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
          >
            Next Round!
          </button>
          <button
            onClick={() => setPhase("setup")}
            className="bg-gray-300 text-gray-700 px-8 py-3 rounded-full font-bold text-xl hover:bg-gray-400 transition-all"
          >
            Change Difficulty
          </button>
        </div>
      </div>
    </div>
  );
}
