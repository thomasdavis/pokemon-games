"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { sayCorrect, sayWrong, celebrateWin, announceScore } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

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

// Helper to get type color with fallback for any types not in the map
const getTypeColor = (type: string): string => typeColors[type] || "bg-gray-500";
const getTypeEmoji = (type: string): string => typeEmojis[type] || "❓";

export default function QuizPage() {
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);

  const { name: playerName } = usePlayer();
  const QUIZ_LENGTH = 10;

  const generateQuestion = useCallback(() => {
    const randomPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
    const correctType = randomPokemon.types[0]; // Use primary type

    const wrongTypes = allTypes
      .filter((t) => !randomPokemon.types.includes(t))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [correctType, ...wrongTypes].sort(() => Math.random() - 0.5);

    setCurrentPokemon(randomPokemon);
    setOptions(allOptions);
    setAnswered(false);
    setSelectedAnswer(null);
  }, []);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswer = (type: string) => {
    if (answered) return;

    // Play click sound when selecting answer
    playSound('click');

    setSelectedAnswer(type);
    setAnswered(true);
    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);

    const isCorrect = currentPokemon?.types.includes(type);
    let newScore = score;

    if (isCorrect) {
      newScore = score + 1;
      setScore(newScore);
      // Play success sound and say correct
      playSound('success');
      sayCorrect();
      // Get personalized message for correct answer
      const msg = getQuickPersonalizedMessage(playerName, 'correct_answer');
      setFeedbackMessage(msg);
    } else {
      // Play error sound and say wrong
      playSound('error');
      sayWrong();
      // Get personalized message for wrong answer
      const msg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
      setFeedbackMessage(msg);
    }

    // Check if quiz is complete
    if (newQuestionsAnswered >= QUIZ_LENGTH) {
      setQuizComplete(true);
      const percentage = Math.round((newScore / QUIZ_LENGTH) * 100);
      // Play win sound and celebrate if good score (>= 70%)
      if (percentage >= 70) {
        playSound('win');
        celebrateWin();
      }
      // Announce final score
      setTimeout(() => {
        announceScore(newScore);
      }, 1500);
      // Get personalized completion message
      const completionMsg = getQuickPersonalizedMessage(playerName, 'completed_quiz', { score: newScore });
      setFeedbackMessage(completionMsg);
    }
  };

  const handleNext = () => {
    setFeedbackMessage(null);
    generateQuestion();
  };

  const restartQuiz = () => {
    setScore(0);
    setQuestionsAnswered(0);
    setQuizComplete(false);
    setFeedbackMessage(null);
    generateQuestion();
  };

  const isCorrectAnswer = (type: string) => currentPokemon?.types.includes(type);

  // Quiz complete screen
  if (quizComplete) {
    const percentage = Math.round((score / QUIZ_LENGTH) * 100);
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
          Quiz Complete!
        </h1>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4">
            {percentage >= 70 ? "🏆" : percentage >= 50 ? "⭐" : "💪"}
          </div>
          <h2 className="text-3xl font-bold mb-2">
            Great job, {playerName}!
          </h2>
          <p className="text-2xl text-gray-600 mb-4">
            You scored <span className="font-bold text-green-600">{score}</span> out of {QUIZ_LENGTH}
          </p>
          <p className="text-xl text-gray-500 mb-6">
            {percentage}% correct
          </p>

          {feedbackMessage && (
            <div className="bg-yellow-100 rounded-2xl p-4 mb-6">
              <span className="text-2xl mr-2">{feedbackMessage.emoji}</span>
              <span className="text-xl font-medium">{feedbackMessage.message}</span>
            </div>
          )}

          <button
            onClick={restartQuiz}
            className="bg-orange-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
          >
            Play Again!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-orange-600 mb-4">
        Type Quiz
      </h1>

      {/* Player name display */}
      <div className="text-center mb-4">
        <span className="bg-yellow-100 px-4 py-2 rounded-full text-lg">
          Player: <span className="font-bold">{playerName}</span>
        </span>
      </div>

      <div className="flex justify-center gap-8 text-xl mb-8">
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Score: <span className="font-bold text-green-600">{score}</span> / {questionsAnswered}
        </span>
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Question {questionsAnswered + (answered ? 0 : 1)} / {QUIZ_LENGTH}
        </span>
        {questionsAnswered > 0 && (
          <span className="bg-white px-6 py-2 rounded-full shadow">
            {Math.round((score / questionsAnswered) * 100)}% correct
          </span>
        )}
      </div>

      {currentPokemon && (
        <div className="max-w-2xl mx-auto">
          {/* Pokemon Display */}
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl text-center">
            <Image
              src={currentPokemon.image}
              alt={currentPokemon.name}
              width={200}
              height={200}
              className="mx-auto mb-4"
            />
            <h2 className="text-3xl font-bold">{currentPokemon.name}</h2>
            <p className="text-xl text-gray-600 mt-2">What type is this Pokemon?</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((type) => {
              const typeColor = getTypeColor(type);
              let buttonStyle = `${typeColor} text-white opacity-90 hover:opacity-100`;

              if (answered) {
                if (isCorrectAnswer(type)) {
                  buttonStyle = `${typeColor} text-white ring-4 ring-green-400 scale-105`;
                } else if (selectedAnswer === type) {
                  buttonStyle = `${typeColor} text-white opacity-50 ring-4 ring-red-500`;
                } else {
                  buttonStyle = `${typeColor} text-white opacity-40`;
                }
              }

              return (
                <button
                  key={type}
                  onClick={() => handleAnswer(type)}
                  disabled={answered}
                  className={`p-6 rounded-2xl font-bold text-2xl transition-all capitalize flex items-center justify-center gap-3 ${buttonStyle}`}
                >
                  <span className="text-3xl">{getTypeEmoji(type)}</span>
                  {type}
                </button>
              );
            })}
          </div>

          {/* Result Message */}
          {answered && (
            <div className="text-center mt-8">
              {/* Personalized feedback message */}
              {feedbackMessage && (
                <div className="bg-yellow-100 rounded-2xl p-4 mb-4 inline-block">
                  <span className="text-2xl mr-2">{feedbackMessage.emoji}</span>
                  <span className="text-xl font-medium">{feedbackMessage.message}</span>
                </div>
              )}
              <div
                className={`text-2xl font-bold mb-4 ${
                  isCorrectAnswer(selectedAnswer!) ? "text-green-600" : "text-red-500"
                }`}
              >
                {isCorrectAnswer(selectedAnswer!) ? (
                  <>Correct! {currentPokemon.name} is a {currentPokemon.types.join("/")} type!</>
                ) : (
                  <>Not quite! {currentPokemon.name} is actually a {currentPokemon.types.join("/")} type!</>
                )}
              </div>
              {questionsAnswered < QUIZ_LENGTH && (
                <button
                  onClick={handleNext}
                  className="bg-orange-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-orange-600 transition-all hover:scale-105 shadow-lg"
                >
                  Next Question!
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
