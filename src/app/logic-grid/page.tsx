"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";

// ============ TYPES ============

type CellState = "unknown" | "yes" | "no";

interface GridCell {
  pokemonId: number;
  pokemonName: string;
  attribute: string;
  attributeValue: string;
  state: CellState;
}

interface Clue {
  text: string;
  used: boolean;
}

interface PuzzleSolution {
  [pokemonName: string]: {
    type: string;
    generation: string;
    height: string;
    weight: string;
    stat: string;
  };
}

interface LogicPuzzle {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  pokemonNames: string[];
  attributes: {
    type: string[];
    generation: string[];
    height: string[];
    weight: string[];
    stat: string[];
  };
  clues: string[];
  solution: PuzzleSolution;
}

// ============ PUZZLE DATA ============

const PUZZLES: LogicPuzzle[] = [
  {
    id: "puzzle-1",
    name: "Starter Squad",
    difficulty: "easy",
    pokemonNames: ["Pikachu", "Charmander", "Squirtle", "Bulbasaur", "Eevee"],
    attributes: {
      type: ["Electric", "Fire", "Water", "Grass", "Normal"],
      generation: ["Gen I", "Gen I", "Gen I", "Gen I", "Gen I"],
      height: ["Tiny", "Small", "Small", "Small", "Small"],
      weight: ["Light", "Light", "Medium", "Medium", "Light"],
      stat: ["Speed", "Sp.Atk", "Defense", "Sp.Def", "Balanced"],
    },
    clues: [
      "Pikachu is an Electric type.",
      "Charmander is a Fire type.",
      "Squirtle is a Water type with strong Defense.",
      "Bulbasaur is a Grass type with good Sp.Def.",
      "Eevee is a Normal type with Balanced stats.",
      "The Electric type Pokemon is the fastest.",
      "The Fire type Pokemon has high Sp.Atk.",
      "Pikachu is Tiny, the smallest of all.",
      "Squirtle and Bulbasaur are Medium weight.",
      "Charmander, Pikachu, and Eevee are Light weight.",
    ],
    solution: {
      Pikachu: { type: "Electric", generation: "Gen I", height: "Tiny", weight: "Light", stat: "Speed" },
      Charmander: { type: "Fire", generation: "Gen I", height: "Small", weight: "Light", stat: "Sp.Atk" },
      Squirtle: { type: "Water", generation: "Gen I", height: "Small", weight: "Medium", stat: "Defense" },
      Bulbasaur: { type: "Grass", generation: "Gen I", height: "Small", weight: "Medium", stat: "Sp.Def" },
      Eevee: { type: "Normal", generation: "Gen I", height: "Small", weight: "Light", stat: "Balanced" },
    },
  },
  {
    id: "puzzle-2",
    name: "Type Masters",
    difficulty: "medium",
    pokemonNames: ["Gengar", "Alakazam", "Machamp", "Golem", "Dragonite"],
    attributes: {
      type: ["Ghost", "Psychic", "Fighting", "Rock", "Dragon"],
      generation: ["Gen I", "Gen I", "Gen I", "Gen I", "Gen I"],
      height: ["Medium", "Medium", "Tall", "Medium", "Tall"],
      weight: ["Heavy", "Light", "Heavy", "Very Heavy", "Heavy"],
      stat: ["Speed", "Sp.Atk", "Attack", "Defense", "Attack"],
    },
    clues: [
      "The Ghost type Pokemon is known for its Speed.",
      "Alakazam is a Psychic type with incredible Sp.Atk.",
      "The Fighting type Pokemon is Tall and has the highest Attack.",
      "Golem is a Rock type and is Very Heavy.",
      "Dragonite is a Dragon type and is Tall.",
      "Gengar is not Heavy - it's actually quite Light despite being ghostly!",
      "The Pokemon with Defense as their best stat weighs the most.",
      "Machamp and Dragonite are both Tall.",
      "Alakazam is Light weight.",
      "Gengar is Medium height.",
    ],
    solution: {
      Gengar: { type: "Ghost", generation: "Gen I", height: "Medium", weight: "Light", stat: "Speed" },
      Alakazam: { type: "Psychic", generation: "Gen I", height: "Medium", weight: "Light", stat: "Sp.Atk" },
      Machamp: { type: "Fighting", generation: "Gen I", height: "Tall", weight: "Heavy", stat: "Attack" },
      Golem: { type: "Rock", generation: "Gen I", height: "Medium", weight: "Very Heavy", stat: "Defense" },
      Dragonite: { type: "Dragon", generation: "Gen I", height: "Tall", weight: "Heavy", stat: "Attack" },
    },
  },
  {
    id: "puzzle-3",
    name: "Legendary Challenge",
    difficulty: "hard",
    pokemonNames: ["Mewtwo", "Mew", "Articuno", "Zapdos", "Moltres"],
    attributes: {
      type: ["Psychic", "Psychic", "Ice", "Electric", "Fire"],
      generation: ["Gen I", "Gen I", "Gen I", "Gen I", "Gen I"],
      height: ["Tall", "Tiny", "Tall", "Tall", "Tall"],
      weight: ["Heavy", "Light", "Medium", "Medium", "Medium"],
      stat: ["Sp.Atk", "Balanced", "Sp.Def", "Speed", "Sp.Atk"],
    },
    clues: [
      "Both Mewtwo and Mew are Psychic types.",
      "The three legendary birds are Articuno, Zapdos, and Moltres.",
      "The Ice type bird has the best Sp.Def.",
      "The Electric type bird is the fastest.",
      "The Fire type bird excels at Sp.Atk.",
      "Mewtwo is Tall and Heavy with incredible Sp.Atk.",
      "Mew is the smallest - Tiny and Light!",
      "All three birds are Tall and Medium weight.",
      "The Psychic with Balanced stats is very small.",
      "Articuno is an Ice type legendary bird.",
    ],
    solution: {
      Mewtwo: { type: "Psychic", generation: "Gen I", height: "Tall", weight: "Heavy", stat: "Sp.Atk" },
      Mew: { type: "Psychic", generation: "Gen I", height: "Tiny", weight: "Light", stat: "Balanced" },
      Articuno: { type: "Ice", generation: "Gen I", height: "Tall", weight: "Medium", stat: "Sp.Def" },
      Zapdos: { type: "Electric", generation: "Gen I", height: "Tall", weight: "Medium", stat: "Speed" },
      Moltres: { type: "Fire", generation: "Gen I", height: "Tall", weight: "Medium", stat: "Sp.Atk" },
    },
  },
  {
    id: "puzzle-4",
    name: "Eeveelutions",
    difficulty: "medium",
    pokemonNames: ["Vaporeon", "Jolteon", "Flareon", "Espeon", "Umbreon"],
    attributes: {
      type: ["Water", "Electric", "Fire", "Psychic", "Dark"],
      generation: ["Gen I", "Gen I", "Gen I", "Gen II", "Gen II"],
      height: ["Medium", "Medium", "Small", "Medium", "Medium"],
      weight: ["Heavy", "Light", "Light", "Light", "Medium"],
      stat: ["HP", "Speed", "Attack", "Sp.Atk", "Sp.Def"],
    },
    clues: [
      "Vaporeon is a Water type with high HP.",
      "The Electric type Eeveelution is the fastest.",
      "Flareon is a Fire type with strong Attack.",
      "The Psychic type Eeveelution has the best Sp.Atk.",
      "Umbreon is a Dark type with great Sp.Def.",
      "Espeon and Umbreon are from Gen II, the others from Gen I.",
      "Vaporeon is the heaviest Eeveelution.",
      "Jolteon is Light and very fast.",
      "Flareon is the smallest of the group.",
      "The Dark type is Medium weight.",
    ],
    solution: {
      Vaporeon: { type: "Water", generation: "Gen I", height: "Medium", weight: "Heavy", stat: "HP" },
      Jolteon: { type: "Electric", generation: "Gen I", height: "Medium", weight: "Light", stat: "Speed" },
      Flareon: { type: "Fire", generation: "Gen I", height: "Small", weight: "Light", stat: "Attack" },
      Espeon: { type: "Psychic", generation: "Gen II", height: "Medium", weight: "Light", stat: "Sp.Atk" },
      Umbreon: { type: "Dark", generation: "Gen II", height: "Medium", weight: "Medium", stat: "Sp.Def" },
    },
  },
];

// ============ HELPER FUNCTIONS ============

function getPokemonByName(name: string): Pokemon | undefined {
  return pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
}

function getUniqueAttributes(puzzle: LogicPuzzle): Record<string, string[]> {
  return {
    type: [...new Set(puzzle.attributes.type)],
    generation: [...new Set(puzzle.attributes.generation)],
    height: [...new Set(puzzle.attributes.height)],
    weight: [...new Set(puzzle.attributes.weight)],
    stat: [...new Set(puzzle.attributes.stat)],
  };
}

// ============ MAIN COMPONENT ============

export default function LogicGridPage() {
  const { name: playerName } = usePlayer();

  const [selectedPuzzle, setSelectedPuzzle] = useState<LogicPuzzle | null>(null);
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won">("menu");
  const [timer, setTimer] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [selectedAttribute, setSelectedAttribute] = useState<string>("type");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing") {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Initialize grid for a puzzle
  const initializePuzzle = useCallback((puzzle: LogicPuzzle) => {
    const uniqueAttrs = getUniqueAttributes(puzzle);
    const newGrid: GridCell[] = [];

    // Create cells for each pokemon-attribute combination
    puzzle.pokemonNames.forEach(pokemonName => {
      const poke = getPokemonByName(pokemonName);
      if (!poke) return;

      Object.entries(uniqueAttrs).forEach(([attrType, values]) => {
        values.forEach(value => {
          newGrid.push({
            pokemonId: poke.id,
            pokemonName,
            attribute: attrType,
            attributeValue: value,
            state: "unknown",
          });
        });
      });
    });

    setGrid(newGrid);
    setClues(puzzle.clues.map(text => ({ text, used: false })));
    setSelectedPuzzle(puzzle);
    setGameState("playing");
    setTimer(0);
    setHint(null);
    setHintsUsed(0);
    setErrorMessage(null);

    // Read first clue aloud
    speak(`Let's solve the ${puzzle.name} puzzle! Here's your first clue: ${puzzle.clues[0]}`);
  }, []);

  // Toggle cell state
  const toggleCell = useCallback((pokemonName: string, attribute: string, value: string) => {
    playSound("click");

    setGrid(prevGrid => {
      return prevGrid.map(cell => {
        if (cell.pokemonName === pokemonName &&
            cell.attribute === attribute &&
            cell.attributeValue === value) {
          const states: CellState[] = ["unknown", "yes", "no"];
          const currentIndex = states.indexOf(cell.state);
          const nextState = states[(currentIndex + 1) % 3];
          return { ...cell, state: nextState };
        }
        return cell;
      });
    });

    setHint(null);
  }, []);

  // Check solution
  const checkSolution = useCallback(() => {
    if (!selectedPuzzle) return;

    let isCorrect = true;
    const solution = selectedPuzzle.solution;

    // Check each Pokemon's attributes
    for (const pokemonName of selectedPuzzle.pokemonNames) {
      const pokemonSolution = solution[pokemonName];

      for (const [attrType, correctValue] of Object.entries(pokemonSolution)) {
        const cell = grid.find(
          c => c.pokemonName === pokemonName &&
               c.attribute === attrType &&
               c.attributeValue === correctValue
        );

        if (!cell || cell.state !== "yes") {
          isCorrect = false;
          break;
        }
      }
      if (!isCorrect) break;
    }

    if (isCorrect) {
      playSound("success");
      speak(`Congratulations ${playerName}! You solved the puzzle!`);
      setGameState("won");
    } else {
      playSound("error");
      setErrorMessage("Not quite right! Some cells are incorrect or missing. Keep trying!");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }, [selectedPuzzle, grid, playerName]);

  // Get AI hint
  const getHint = useCallback(async () => {
    if (!selectedPuzzle || isLoadingHint) return;

    setIsLoadingHint(true);
    playSound("ding");

    try {
      const response = await fetch("/api/logic-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: selectedPuzzle.id,
          gridState: grid,
          clues: clues,
          playerName,
        }),
      });

      if (!response.ok) throw new Error("Failed to get hint");

      const data = await response.json();
      setHint(data.hint);
      setHintsUsed(prev => prev + 1);
      speak(data.hint);
    } catch (error) {
      console.error("Error getting hint:", error);
      setHint("Sorry, I couldn't generate a hint right now. Try looking at the clues again!");
    } finally {
      setIsLoadingHint(false);
    }
  }, [selectedPuzzle, grid, clues, playerName, isLoadingHint]);

  // Read clue aloud
  const readClue = (text: string, index: number) => {
    playSound("click");
    speak(`Clue ${index + 1}: ${text}`);
    setClues(prev => prev.map((c, i) => i === index ? { ...c, used: true } : c));
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate score
  const calculateScore = () => {
    const baseScore = 1000;
    const timeDeduction = Math.floor(timer / 10) * 5;
    const hintDeduction = hintsUsed * 50;
    return Math.max(0, baseScore - timeDeduction - hintDeduction);
  };

  // ============ RENDER: MENU ============
  if (gameState === "menu") {
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-purple-600 mb-2">
          PokeLogic Grid
        </h1>
        <p className="text-center text-gray-600 mb-8 text-lg">
          Use logic to match Pokemon with their attributes!
        </p>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-xl mb-8">
            <h2 className="text-2xl font-bold mb-4 text-center">How to Play</h2>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-3xl mb-2">1</div>
                <p>Read the clues carefully</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-3xl mb-2">2</div>
                <p>Click cells to cycle: ? &rarr; &#10003; &rarr; &#10007;</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-3xl mb-2">3</div>
                <p>Match each Pokemon to ONE value per attribute!</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 text-center">Choose a Puzzle</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {PUZZLES.map(puzzle => (
              <button
                key={puzzle.id}
                onClick={() => initializePuzzle(puzzle)}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex -space-x-3">
                    {puzzle.pokemonNames.slice(0, 3).map(name => {
                      const poke = getPokemonByName(name);
                      return poke ? (
                        <Image
                          key={name}
                          src={poke.image}
                          alt={name}
                          width={48}
                          height={48}
                          className="rounded-full bg-gray-100 border-2 border-white"
                        />
                      ) : null;
                    })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{puzzle.name}</h3>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      puzzle.difficulty === "easy" ? "bg-green-100 text-green-700" :
                      puzzle.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  {puzzle.pokemonNames.join(", ")}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {puzzle.clues.length} clues
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============ RENDER: WON ============
  if (gameState === "won") {
    const score = calculateScore();
    return (
      <div className="py-8">
        <h1 className="text-4xl font-bold text-center text-purple-600 mb-4">
          Puzzle Solved!
        </h1>

        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4">&#127942;</div>
          <h2 className="text-3xl font-bold mb-2">
            Great job, {playerName}!
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            You solved &quot;{selectedPuzzle?.name}&quot;!
          </p>

          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-purple-50 p-4 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{formatTime(timer)}</div>
              <div className="text-sm text-gray-600">Time</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{hintsUsed}</div>
              <div className="text-sm text-gray-600">Hints Used</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{score}</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setGameState("menu")}
              className="bg-purple-500 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-purple-600 transition-all hover:scale-105 shadow-lg"
            >
              Play Another!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ RENDER: PLAYING ============
  if (!selectedPuzzle) return null;

  const uniqueAttrs = getUniqueAttributes(selectedPuzzle);
  const currentAttrValues = uniqueAttrs[selectedAttribute] || [];

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setGameState("menu")}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-purple-600">
          {selectedPuzzle.name}
        </h1>
        <div className="flex items-center gap-4">
          <span className="bg-purple-100 px-4 py-2 rounded-lg font-mono text-lg">
            {formatTime(timer)}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Clues Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span>&#128270;</span> Clues
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {clues.map((clue, index) => (
                <button
                  key={index}
                  onClick={() => readClue(clue.text, index)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                    clue.used
                      ? "bg-green-50 border-2 border-green-200"
                      : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                  }`}
                >
                  <span className="font-bold text-purple-600">{index + 1}.</span>{" "}
                  {clue.text}
                  {clue.used && <span className="ml-2 text-green-600">&#10003;</span>}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={getHint}
                disabled={isLoadingHint}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-gray-900 px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingHint ? (
                  <>
                    <span className="animate-spin">&#10227;</span>
                    Thinking...
                  </>
                ) : (
                  <>
                    <span>&#128161;</span>
                    Get AI Hint ({hintsUsed} used)
                  </>
                )}
              </button>
              {hint && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm border-2 border-yellow-200">
                  {hint}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            {/* Attribute tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {Object.keys(uniqueAttrs).map(attr => (
                <button
                  key={attr}
                  onClick={() => setSelectedAttribute(attr)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedAttribute === attr
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border-2 border-gray-200 bg-gray-50 w-24"></th>
                    {currentAttrValues.map(value => (
                      <th
                        key={value}
                        className="p-2 border-2 border-gray-200 bg-purple-50 text-sm font-bold min-w-[80px]"
                      >
                        {value}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedPuzzle.pokemonNames.map(pokemonName => {
                    const poke = getPokemonByName(pokemonName);
                    return (
                      <tr key={pokemonName}>
                        <td className="p-2 border-2 border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2">
                            {poke && (
                              <Image
                                src={poke.image}
                                alt={pokemonName}
                                width={36}
                                height={36}
                                className="rounded"
                              />
                            )}
                            <span className="font-medium text-sm">{pokemonName}</span>
                          </div>
                        </td>
                        {currentAttrValues.map(value => {
                          const cell = grid.find(
                            c => c.pokemonName === pokemonName &&
                                 c.attribute === selectedAttribute &&
                                 c.attributeValue === value
                          );
                          const state = cell?.state || "unknown";

                          return (
                            <td
                              key={value}
                              className="p-0 border-2 border-gray-200"
                            >
                              <button
                                onClick={() => toggleCell(pokemonName, selectedAttribute, value)}
                                className={`w-full h-full min-h-[48px] flex items-center justify-center text-2xl font-bold transition-colors ${
                                  state === "yes"
                                    ? "bg-green-100 hover:bg-green-200 text-green-600"
                                    : state === "no"
                                    ? "bg-red-100 hover:bg-red-200 text-red-600"
                                    : "bg-white hover:bg-gray-100 text-gray-400"
                                }`}
                              >
                                {state === "yes" ? "✓" : state === "no" ? "✗" : "?"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-center">
                {errorMessage}
              </div>
            )}

            {/* Check Solution Button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={checkSolution}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-lg"
              >
                Check Solution &#10003;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
