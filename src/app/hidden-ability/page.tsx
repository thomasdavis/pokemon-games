"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Base ability descriptions (subset for the game)
const ABILITY_DESCRIPTIONS: Record<string, string> = {
  // Starter abilities - EASY
  "Overgrow": "Powers up Grass-type moves when the Pokemon's HP is low.",
  "Blaze": "Powers up Fire-type moves when the Pokemon's HP is low.",
  "Torrent": "Powers up Water-type moves when the Pokemon's HP is low.",
  "Swarm": "Powers up Bug-type moves when the Pokemon's HP is low.",

  // Common type-based - EASY
  "Chlorophyll": "Boosts the Pokemon's Speed stat in harsh sunlight.",
  "Swift Swim": "Boosts the Pokemon's Speed stat in rain.",
  "Sand Rush": "Boosts the Pokemon's Speed stat in a sandstorm.",
  "Slush Rush": "Boosts the Pokemon's Speed stat in a hailstorm.",

  // Defensive abilities
  "Sturdy": "The Pokemon cannot be knocked out with one hit.",
  "Shell Armor": "A hard shell protects the Pokemon from critical hits.",
  "Rock Head": "Protects the Pokemon from recoil damage.",
  "Thick Fat": "Halves the damage taken from Fire and Ice-type moves.",

  // Immunity/absorption abilities
  "Levitate": "By floating in the air, the Pokemon receives full immunity to Ground-type moves.",
  "Water Absorb": "Restores HP if hit by a Water-type move instead of taking damage.",
  "Volt Absorb": "Restores HP if hit by an Electric-type move instead of taking damage.",
  "Flash Fire": "Powers up Fire-type moves if hit by one. Grants immunity to Fire-type moves.",
  "Lightning Rod": "Draws in Electric-type moves to boost Special Attack instead of taking damage.",
  "Motor Drive": "Boosts Speed if hit by an Electric-type move instead of taking damage.",
  "Sap Sipper": "Boosts Attack if hit by a Grass-type move instead of taking damage.",

  // Offensive abilities
  "Huge Power": "Doubles the Pokemon's Attack stat.",
  "Technician": "Powers up the Pokemon's weaker moves.",
  "Adaptability": "Powers up moves of the same type as the Pokemon.",
  "Hustle": "Boosts the Attack stat, but lowers accuracy.",
  "Guts": "Boosts the Attack stat if the Pokemon has a status condition.",
  "Moxie": "Boosts Attack stat after knocking out any Pokemon.",

  // Speed abilities
  "Speed Boost": "The Pokemon's Speed stat is boosted every turn.",
  "Quick Feet": "Boosts Speed if the Pokemon has a status condition.",
  "Prankster": "Gives priority to status moves.",

  // Status abilities
  "Static": "Contact with the Pokemon may cause paralysis.",
  "Flame Body": "Contact with the Pokemon may burn the attacker.",
  "Poison Point": "Contact with the Pokemon may poison the attacker.",
  "Effect Spore": "Contact may inflict poison, sleep, or paralysis.",
  "Cute Charm": "Contact with the Pokemon may cause infatuation.",

  // Immunity abilities
  "Immunity": "Prevents the Pokemon from getting poisoned.",
  "Insomnia": "Prevents the Pokemon from falling asleep.",
  "Own Tempo": "Prevents the Pokemon from being confused.",
  "Inner Focus": "Prevents the Pokemon from flinching.",
  "Limber": "Protects the Pokemon from paralysis.",
  "Water Veil": "Prevents the Pokemon from being burned.",
  "Magma Armor": "Prevents the Pokemon from being frozen.",

  // Field abilities
  "Intimidate": "Lowers opposing Pokemon's Attack stat upon entering battle.",
  "Pressure": "Raises the PP usage of opposing Pokemon's moves.",
  "Arena Trap": "Prevents opposing Pokemon from fleeing.",
  "Shadow Tag": "Prevents opposing Pokemon from escaping.",

  // Weather abilities
  "Drought": "Turns the sunlight harsh when entering battle.",
  "Drizzle": "Makes it rain when entering battle.",
  "Sand Stream": "Summons a sandstorm when entering battle.",
  "Snow Warning": "Summons a hailstorm when entering battle.",

  // Unique abilities
  "Wonder Guard": "Only supereffective moves will hit the Pokemon.",
  "Magic Guard": "The Pokemon only takes damage from attacks.",
  "Magic Bounce": "Reflects status moves instead of getting hit by them.",
  "Disguise": "Once per battle, can withstand one physical attack using its disguise.",
  "Imposter": "Transforms into the Pokemon it's facing.",
  "Trace": "Copies an opposing Pokemon's Ability when entering battle.",
  "Natural Cure": "All status conditions heal when the Pokemon switches out.",
  "Regenerator": "Restores HP when withdrawn from battle.",
  "Pickup": "The Pokemon may pick up items.",
  "Compound Eyes": "Boosts the Pokemon's accuracy.",
  "Keen Eye": "Prevents other Pokemon from lowering its accuracy.",
  "Run Away": "Enables a sure getaway from wild Pokemon.",
  "No Guard": "Ensures incoming and outgoing attacks always land.",
  "Synchronize": "Passes status conditions to the attacker.",
  "Shed Skin": "May heal its own status conditions.",
  "Forecast": "Changes type based on the weather.",
  "Color Change": "Changes type to match the move used on it.",
};

// Categorize abilities by difficulty
const EASY_ABILITIES = [
  "Overgrow", "Blaze", "Torrent", "Swarm", "Static", "Flame Body",
  "Intimidate", "Levitate", "Sturdy", "Pickup", "Run Away", "Keen Eye",
  "Water Absorb", "Flash Fire", "Immunity", "Insomnia",
];

const HARD_ABILITIES = [
  "Wonder Guard", "Magic Bounce", "Disguise", "Imposter", "Prankster",
  "Moxie", "Speed Boost", "Huge Power", "Adaptability", "Technician",
  "Regenerator", "Magic Guard", "Trace", "Forecast", "Color Change",
  "Shadow Tag", "Arena Trap", "No Guard", "Synchronize",
];

type Difficulty = "easy" | "hard";

interface ParaphraseCache {
  [key: string]: string;
}

export default function HiddenAbilityPage() {
  const { name: playerName } = usePlayer();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [targetAbility, setTargetAbility] = useState<string>("");
  const [targetDescription, setTargetDescription] = useState<string>("");
  const [paraphrasedDescription, setParaphrasedDescription] = useState<string>("");
  const [options, setOptions] = useState<Pokemon[]>([]);
  const [correctPokemon, setCorrectPokemon] = useState<Pokemon | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [personalizedMessage, setPersonalizedMessage] = useState<{ message: string; emoji: string } | null>(null);
  const [paraphraseCache, setParaphraseCache] = useState<ParaphraseCache>({});

  // Get Pokemon that have a specific ability
  const getPokemonWithAbility = useCallback((abilityName: string): Pokemon[] => {
    return pokemon.filter(p =>
      p.abilities.some(a => a.name === abilityName)
    );
  }, []);

  // Get Pokemon that don't have a specific ability
  const getPokemonWithoutAbility = useCallback((abilityName: string): Pokemon[] => {
    return pokemon.filter(p =>
      !p.abilities.some(a => a.name === abilityName)
    );
  }, []);

  // Fetch paraphrased ability description
  const fetchParaphrase = useCallback(async (abilityName: string): Promise<string> => {
    // Check cache first
    if (paraphraseCache[abilityName]) {
      return paraphraseCache[abilityName];
    }

    try {
      const response = await fetch('/api/ability-paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityName, playerName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch paraphrase');
      }

      const data = await response.json();
      const paraphrase = data.text;

      // Cache the result
      setParaphraseCache(prev => ({
        ...prev,
        [abilityName]: paraphrase
      }));

      return paraphrase;
    } catch (error) {
      console.error('Error fetching paraphrase:', error);
      // Fallback to original description
      return ABILITY_DESCRIPTIONS[abilityName] || `A special ability called ${abilityName}!`;
    }
  }, [paraphraseCache, playerName]);

  // Generate a new round
  const generateRound = useCallback(async () => {
    setLoading(true);
    setAnswered(false);
    setSelectedPokemon(null);
    setIsCorrect(null);
    setPersonalizedMessage(null);

    // Select abilities based on difficulty
    const abilityPool = difficulty === "easy" ? EASY_ABILITIES : HARD_ABILITIES;

    // Find an ability that at least one Pokemon has
    let selectedAbility = "";
    let pokemonWithAbility: Pokemon[] = [];

    const shuffledAbilities = [...abilityPool].sort(() => Math.random() - 0.5);

    for (const ability of shuffledAbilities) {
      const candidates = getPokemonWithAbility(ability);
      if (candidates.length > 0) {
        selectedAbility = ability;
        pokemonWithAbility = candidates;
        break;
      }
    }

    if (!selectedAbility || pokemonWithAbility.length === 0) {
      // Fallback to any ability with Pokemon
      const allAbilities = Object.keys(ABILITY_DESCRIPTIONS);
      for (const ability of allAbilities.sort(() => Math.random() - 0.5)) {
        const candidates = getPokemonWithAbility(ability);
        if (candidates.length > 0) {
          selectedAbility = ability;
          pokemonWithAbility = candidates;
          break;
        }
      }
    }

    // Pick a random correct Pokemon
    const correct = pokemonWithAbility[Math.floor(Math.random() * pokemonWithAbility.length)];

    // Get 3 wrong Pokemon (that don't have this ability)
    const pokemonWithoutAbility = getPokemonWithoutAbility(selectedAbility);
    const wrongPokemon = pokemonWithoutAbility
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Combine and shuffle options
    const allOptions = [correct, ...wrongPokemon].sort(() => Math.random() - 0.5);

    setTargetAbility(selectedAbility);
    setTargetDescription(ABILITY_DESCRIPTIONS[selectedAbility] || "");
    setCorrectPokemon(correct);
    setOptions(allOptions);

    // Fetch paraphrased description
    const paraphrase = await fetchParaphrase(selectedAbility);
    setParaphrasedDescription(paraphrase);

    // Speak the paraphrased description
    speak(paraphrase, { rate: 0.9, pitch: 1.1 });

    setLoading(false);
  }, [difficulty, getPokemonWithAbility, getPokemonWithoutAbility, fetchParaphrase]);

  // Initialize game
  useEffect(() => {
    generateRound();
  }, [generateRound]);

  // Handle answer selection
  const handleAnswer = (selected: Pokemon) => {
    if (answered) return;

    playSound('click');
    setSelectedPokemon(selected);
    setAnswered(true);

    const hasAbility = selected.abilities.some(a => a.name === targetAbility);
    setIsCorrect(hasAbility);

    if (hasAbility) {
      playSound('success');
      const newStreak = streak + 1;
      const points = difficulty === "hard" ? 20 : 10;
      const streakBonus = Math.floor(newStreak / 3) * 5;
      setScore(prev => prev + points + streakBonus);
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      speak("That's right!", { rate: 1.1, pitch: 1.2 });

      if (newStreak >= 3 && newStreak % 3 === 0) {
        playSound('win');
        const streakMsg = getQuickPersonalizedMessage(playerName, 'streak', { streak: newStreak });
        setPersonalizedMessage(streakMsg);
      } else {
        const correctMsg = getQuickPersonalizedMessage(playerName, 'correct_answer');
        setPersonalizedMessage(correctMsg);
      }
    } else {
      playSound('error');
      setStreak(0);
      speak("Not quite! Try again!", { rate: 0.9, pitch: 1.0 });

      const wrongMsg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
      setPersonalizedMessage(wrongMsg);
    }
  };

  // Handle next round
  const handleNext = () => {
    generateRound();
  };

  // Reset game
  const resetGame = () => {
    setScore(0);
    setStreak(0);
    generateRound();
  };

  // Change difficulty
  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
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

      <h1 className="text-4xl font-bold text-center text-purple-600 mb-6">
        Hidden Ability: What&apos;s the Power?
      </h1>

      {/* Difficulty Settings */}
      <div className="max-w-2xl mx-auto mb-6 bg-white rounded-2xl p-4 shadow-lg">
        <h2 className="text-lg font-bold text-gray-700 mb-3 text-center">Difficulty</h2>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => changeDifficulty("easy")}
            className={`px-6 py-2 rounded-full font-bold text-lg transition-all ${
              difficulty === "easy"
                ? "bg-green-500 text-white scale-105 shadow-md"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            Easy
          </button>
          <button
            onClick={() => changeDifficulty("hard")}
            className={`px-6 py-2 rounded-full font-bold text-lg transition-all ${
              difficulty === "hard"
                ? "bg-red-500 text-white scale-105 shadow-md"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            Hard
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          {difficulty === "easy" ? "Common, well-known abilities" : "Rare and tricky abilities"}
        </p>
      </div>

      {/* Score Display */}
      <div className="flex justify-center gap-6 text-xl mb-6">
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Score: <span className="font-bold text-green-600">{score}</span>
        </span>
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Streak: <span className="font-bold text-orange-500">{streak}</span> {streak >= 3 ? "🔥" : ""}
        </span>
        <span className="bg-white px-6 py-2 rounded-full shadow">
          Best: <span className="font-bold text-purple-600">{bestStreak}</span>
        </span>
      </div>

      {loading ? (
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl">
            <div className="text-6xl mb-4 animate-bounce">?</div>
            <p className="text-2xl text-gray-600">Loading ability...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          {/* Ability Card */}
          <div className="bg-gradient-to-br from-purple-400 to-indigo-600 rounded-3xl p-8 mb-8 shadow-xl text-white">
            <div className="text-center">
              <div className="text-5xl mb-4">💫</div>
              <h2 className="text-2xl font-bold mb-4">This Pokemon has a special power!</h2>
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6">
                <p className="text-xl leading-relaxed">
                  {paraphrasedDescription}
                </p>
              </div>
              {answered && (
                <div className="mt-4 bg-white/30 backdrop-blur rounded-xl p-4">
                  <p className="text-lg font-semibold">
                    Ability: <span className="text-yellow-200">{targetAbility}</span>
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {targetDescription}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pokemon Options */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-center text-gray-700 mb-4">
              Which Pokemon has this ability?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {options.map((option) => {
                const isSelected = selectedPokemon?.id === option.id;
                const isCorrectPokemon = correctPokemon?.id === option.id;

                let buttonStyle = "bg-white hover:bg-yellow-50 hover:scale-105 border-4 border-transparent hover:border-yellow-400";

                if (answered) {
                  if (isCorrectPokemon) {
                    buttonStyle = "bg-green-100 border-4 border-green-500 scale-105";
                  } else if (isSelected && !isCorrect) {
                    buttonStyle = "bg-red-100 border-4 border-red-400 opacity-75";
                  } else {
                    buttonStyle = "bg-gray-100 opacity-60";
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option)}
                    disabled={answered}
                    className={`p-4 rounded-2xl transition-all shadow-lg ${buttonStyle}`}
                  >
                    <Image
                      src={option.image}
                      alt={option.name}
                      width={100}
                      height={100}
                      className="mx-auto mb-2"
                    />
                    <p className="text-lg font-bold text-gray-800">{option.name}</p>
                    {answered && isCorrectPokemon && (
                      <div className="mt-2 text-sm text-green-600 font-semibold">
                        Has {targetAbility}!
                      </div>
                    )}
                    {answered && isSelected && !isCorrect && (
                      <div className="mt-2 text-xs text-gray-500">
                        Abilities: {option.abilities.map(a => a.name).join(", ")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Message */}
          {personalizedMessage && (
            <div className="text-center text-xl mb-6 animate-bounce">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full shadow-md">
                {personalizedMessage.emoji} {personalizedMessage.message}
              </span>
            </div>
          )}

          {/* Result Message */}
          {answered && (
            <div className="text-center mb-6">
              <div
                className={`text-3xl font-bold mb-4 ${
                  isCorrect ? "text-green-600" : "text-red-500"
                }`}
              >
                {isCorrect ? (
                  <>Correct! {correctPokemon?.name} has {targetAbility}!</>
                ) : (
                  <>Not quite! {correctPokemon?.name} has {targetAbility}!</>
                )}
              </div>
            </div>
          )}

          {/* Next/Restart Buttons */}
          <div className="text-center">
            {answered ? (
              <button
                onClick={handleNext}
                className="bg-purple-500 text-white px-12 py-4 rounded-full font-bold text-2xl hover:bg-purple-600 transition-all hover:scale-105 shadow-lg"
              >
                Next Ability!
              </button>
            ) : (
              <button
                onClick={() => speak(paraphrasedDescription, { rate: 0.9, pitch: 1.1 })}
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
              >
                🔊 Read Again
              </button>
            )}
          </div>

          {/* Reset Button */}
          {score > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={resetGame}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Reset Score
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
