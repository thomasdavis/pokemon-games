"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon, Pokemon } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak, celebrateWin } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Type colors for display
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

// Type emojis
const typeEmojis: Record<string, string> = {
  normal: "O",
  fire: "F",
  water: "W",
  electric: "E",
  grass: "G",
  ice: "I",
  fighting: "FI",
  poison: "P",
  ground: "GR",
  flying: "FL",
  psychic: "PS",
  bug: "B",
  rock: "R",
  ghost: "GH",
  dragon: "D",
  dark: "DA",
  steel: "ST",
  fairy: "FA",
};

const getTypeColor = (type: string): string => typeColors[type] || "bg-gray-500";

// Grid sizes
type GridSize = 4 | 6;
type Difficulty = "easy" | "medium" | "hard";

interface CellData {
  pokemon: Pokemon | null;
  isFixed: boolean;
  hasConflict: boolean;
}

const DIFFICULTY_SETTINGS: Record<Difficulty, { preFillRatio: number; label: string }> = {
  easy: { preFillRatio: 0.5, label: "Easy" },
  medium: { preFillRatio: 0.35, label: "Medium" },
  hard: { preFillRatio: 0.25, label: "Hard" },
};

// Get Pokemon of a specific type
function getPokemonByType(type: string): Pokemon[] {
  return pokemon.filter(p => p.types[0] === type);
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate a valid solved puzzle using backtracking
function generateSolvedPuzzle(size: GridSize, types: string[]): (Pokemon | null)[][] {
  const grid: (Pokemon | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  const pokemonByType: Record<string, Pokemon[]> = {};

  // Pre-fetch Pokemon for each type
  types.forEach(type => {
    pokemonByType[type] = shuffle(getPokemonByType(type));
  });

  // Check if placing a Pokemon at (row, col) is valid
  function isValid(row: number, col: number, type: string): boolean {
    // Check row for same type
    for (let c = 0; c < size; c++) {
      if (c !== col && grid[row][c]?.types[0] === type) return false;
    }
    // Check column for same type
    for (let r = 0; r < size; r++) {
      if (r !== row && grid[r][col]?.types[0] === type) return false;
    }
    return true;
  }

  // Backtracking solver
  function solve(row: number, col: number): boolean {
    if (row === size) return true;

    const nextCol = (col + 1) % size;
    const nextRow = nextCol === 0 ? row + 1 : row;

    // Try each type in random order
    const shuffledTypes = shuffle([...types]);
    for (const type of shuffledTypes) {
      if (isValid(row, col, type)) {
        const availablePokemon = pokemonByType[type];
        if (availablePokemon.length > 0) {
          const poke = availablePokemon.pop()!;
          grid[row][col] = poke;
          if (solve(nextRow, nextCol)) return true;
          grid[row][col] = null;
          availablePokemon.push(poke);
        }
      }
    }
    return false;
  }

  solve(0, 0);
  return grid;
}

// Create puzzle by removing some cells from solved puzzle
function createPuzzle(
  solvedGrid: (Pokemon | null)[][],
  preFillCount: number
): { grid: CellData[][]; solution: (Pokemon | null)[][] } {
  const size = solvedGrid.length;

  // Create array of all cell positions
  const positions: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push([r, c]);
    }
  }

  // Randomly select which cells to keep filled
  const shuffledPositions = shuffle(positions);
  const fixedPositions = new Set(
    shuffledPositions.slice(0, preFillCount).map(([r, c]) => `${r},${c}`)
  );

  const grid: CellData[][] = Array(size).fill(null).map((_, r) =>
    Array(size).fill(null).map((_, c) => ({
      pokemon: fixedPositions.has(`${r},${c}`) ? solvedGrid[r][c] : null,
      isFixed: fixedPositions.has(`${r},${c}`),
      hasConflict: false,
    }))
  );

  return { grid, solution: solvedGrid };
}

// Check for conflicts in the grid
function checkConflicts(grid: CellData[][]): CellData[][] {
  const size = grid.length;
  const newGrid = grid.map(row => row.map(cell => ({ ...cell, hasConflict: false })));

  // Check each row
  for (let r = 0; r < size; r++) {
    const typeCounts: Record<string, number[]> = {};
    for (let c = 0; c < size; c++) {
      const type = newGrid[r][c].pokemon?.types[0];
      if (type) {
        if (!typeCounts[type]) typeCounts[type] = [];
        typeCounts[type].push(c);
      }
    }
    // Mark conflicts
    Object.values(typeCounts).forEach(cols => {
      if (cols.length > 1) {
        cols.forEach(c => { newGrid[r][c].hasConflict = true; });
      }
    });
  }

  // Check each column
  for (let c = 0; c < size; c++) {
    const typeCounts: Record<string, number[]> = {};
    for (let r = 0; r < size; r++) {
      const type = newGrid[r][c].pokemon?.types[0];
      if (type) {
        if (!typeCounts[type]) typeCounts[type] = [];
        typeCounts[type].push(r);
      }
    }
    // Mark conflicts
    Object.values(typeCounts).forEach(rows => {
      if (rows.length > 1) {
        rows.forEach(r => { newGrid[r][c].hasConflict = true; });
      }
    });
  }

  return newGrid;
}

// Check if puzzle is complete and valid
function isPuzzleComplete(grid: CellData[][]): boolean {
  const size = grid.length;

  // Check all cells are filled
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].pokemon) return false;
      if (grid[r][c].hasConflict) return false;
    }
  }
  return true;
}

// Format time display
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Best types for the puzzle (popular, recognizable)
const RECOMMENDED_TYPES_4 = ["fire", "water", "grass", "electric"];
const RECOMMENDED_TYPES_6 = ["fire", "water", "grass", "electric", "psychic", "ghost"];

// Helper to generate game state
function generateGameState(size: GridSize, diff: Difficulty) {
  const types = size === 4 ? RECOMMENDED_TYPES_4 : RECOMMENDED_TYPES_6;
  const totalCells = size * size;
  const preFillCount = Math.floor(totalCells * DIFFICULTY_SETTINGS[diff].preFillRatio);

  const solvedGrid = generateSolvedPuzzle(size, types);
  const { grid: puzzleGrid, solution: puzzleSolution } = createPuzzle(solvedGrid, preFillCount);

  // Create available tiles - one Pokemon per type for each empty cell
  const tiles: Pokemon[] = [];
  const typeCounts: Record<string, number> = {};

  // Count how many of each type are needed
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!puzzleGrid[r][c].isFixed) {
        const neededType = puzzleSolution[r][c]?.types[0];
        if (neededType) {
          typeCounts[neededType] = (typeCounts[neededType] || 0) + 1;
        }
      }
    }
  }

  // Get Pokemon for each type
  types.forEach(type => {
    const count = typeCounts[type] || 0;
    const typePokemon = shuffle(getPokemonByType(type)).slice(0, count);
    tiles.push(...typePokemon);
  });

  return {
    types,
    puzzleGrid,
    puzzleSolution,
    tiles: shuffle(tiles),
  };
}

// Generate initial state once
const initialGameState = generateGameState(4, "easy");

export default function PokeSudokuPage() {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [grid, setGrid] = useState<CellData[][]>(initialGameState.puzzleGrid);
  const [solution, setSolution] = useState<(Pokemon | null)[][]>(initialGameState.puzzleSolution);
  const [availableTiles, setAvailableTiles] = useState<Pokemon[]>(initialGameState.tiles);
  const [selectedTile, setSelectedTile] = useState<Pokemon | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTypes, setActiveTypes] = useState<string[]>(RECOMMENDED_TYPES_4);
  const [message, setMessage] = useState<{ text: string; emoji: string } | null>(null);
  const [highlightedType, setHighlightedType] = useState<string | null>(null);
  const [gameVersion, setGameVersion] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { name: playerName } = usePlayer();

  // Initialize game - called when user clicks "New Game" or changes settings
  const initializeGame = useCallback(() => {
    const { types, puzzleGrid, puzzleSolution, tiles } = generateGameState(gridSize, difficulty);

    setActiveTypes(types);
    setGrid(puzzleGrid);
    setSolution(puzzleSolution);
    setAvailableTiles(tiles);
    setSelectedTile(null);
    setGameWon(false);
    setTimer(0);
    setIsPlaying(true);
    setMessage(null);
    setHighlightedType(null);
    setGameVersion(v => v + 1);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    playSound('click');
  }, [gridSize, difficulty]);

  // Start timer
  useEffect(() => {
    if (isPlaying && !gameWon) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, gameWon, gameVersion]);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (gameWon) return;

    const cell = grid[row][col];

    // If cell is fixed, can't modify
    if (cell.isFixed) {
      playSound('error', { volume: 0.3 });
      return;
    }

    // If we have a selected tile, place it
    if (selectedTile) {
      // Create deep copy of grid
      const newGrid = grid.map((r, ri) => r.map((c, ci) => {
        if (ri === row && ci === col) {
          return { ...c, pokemon: selectedTile };
        }
        return { ...c };
      }));

      // If cell already has a Pokemon, return it to available tiles
      if (cell.pokemon) {
        setAvailableTiles(prev => [...prev, cell.pokemon!]);
      }

      // Check for conflicts
      const checkedGrid = checkConflicts(newGrid);

      // Check if placing caused a conflict
      if (checkedGrid[row][col].hasConflict) {
        playSound('error', { volume: 0.5 });
        const msg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
        setMessage({ text: msg.message, emoji: msg.emoji });
        setTimeout(() => setMessage(null), 2000);
      } else {
        playSound('click');
      }

      setGrid(checkedGrid);

      // Remove tile from available
      setAvailableTiles(prev => prev.filter(t => t.id !== selectedTile.id));
      setSelectedTile(null);

      // Check for win
      if (isPuzzleComplete(checkedGrid)) {
        handleWin();
      }
    } else if (cell.pokemon) {
      // If clicking on a cell with a Pokemon (non-fixed), remove it
      const removedPokemon = cell.pokemon;
      const newGrid = grid.map((r, ri) => r.map((c, ci) => {
        if (ri === row && ci === col) {
          return { ...c, pokemon: null };
        }
        return { ...c };
      }));

      // Re-check conflicts
      const checkedGrid = checkConflicts(newGrid);
      setGrid(checkedGrid);
      setAvailableTiles(prev => [...prev, removedPokemon]);
      playSound('pop');
    }
  };

  // Handle tile selection
  const handleTileClick = (poke: Pokemon) => {
    if (gameWon) return;

    if (selectedTile?.id === poke.id) {
      setSelectedTile(null);
      setHighlightedType(null);
    } else {
      setSelectedTile(poke);
      setHighlightedType(poke.types[0]);
      playSound('select', { volume: 0.5 });
    }
  };

  // Handle win
  const handleWin = () => {
    setGameWon(true);
    setIsPlaying(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    playSound('win');
    celebrateWin();

    const msg = getQuickPersonalizedMessage(playerName, 'won_game', { score: timer });
    speak(msg.message);
    setMessage({ text: msg.message, emoji: msg.emoji });
  };

  // Check solution (hint feature)
  const checkSolution = () => {
    let hasErrors = false;
    const newGrid = grid.map((row, r) =>
      row.map((cell, c) => {
        if (cell.pokemon && !cell.isFixed) {
          const correctType = solution[r][c]?.types[0];
          if (cell.pokemon.types[0] !== correctType) {
            hasErrors = true;
            return { ...cell, hasConflict: true };
          }
        }
        return cell;
      })
    );

    if (hasErrors) {
      playSound('error');
      const msg = getQuickPersonalizedMessage(playerName, 'wrong_answer');
      setMessage({ text: "Some tiles are in the wrong spot!", emoji: msg.emoji });
    } else {
      playSound('success');
      setMessage({ text: "Looking good so far!", emoji: "O" });
    }

    setGrid(newGrid);
    setTimeout(() => setMessage(null), 2000);
  };

  // Get grid column class based on size
  const gridColsClass = gridSize === 4 ? "grid-cols-4" : "grid-cols-6";
  const cellSizeClass = gridSize === 4 ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14 md:w-18 md:h-18";
  const tileSizeClass = gridSize === 4 ? "w-16 h-16" : "w-14 h-14";

  return (
    <div className="py-8 min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-2">
        PokeSudoku
      </h1>
      <p className="text-center text-gray-500 mb-4">
        Fill the grid so each row and column has unique types
      </p>

      {/* Player greeting */}
      <p className="text-center text-lg text-gray-600 mb-4">
        Good luck, <span className="font-bold text-indigo-600">{playerName}</span>!
      </p>

      {/* Message popup */}
      {message && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-yellow-400 text-gray-800 px-6 py-3 rounded-full shadow-lg font-bold text-xl">
            {message.emoji} {message.text}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {/* Grid Size */}
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 font-medium">Size:</span>
          <button
            onClick={() => {
              if (gridSize !== 4) {
                setGridSize(4);
                // Start new game with 4x4 grid
                const { types, puzzleGrid, puzzleSolution, tiles } = generateGameState(4, difficulty);
                setActiveTypes(types);
                setGrid(puzzleGrid);
                setSolution(puzzleSolution);
                setAvailableTiles(tiles);
                setSelectedTile(null);
                setGameWon(false);
                setTimer(0);
                setIsPlaying(true);
                setMessage(null);
                setHighlightedType(null);
                if (timerRef.current) clearInterval(timerRef.current);
                playSound('click');
              }
            }}
            className={`px-4 py-2 rounded-full font-bold transition-all ${
              gridSize === 4
                ? "bg-indigo-600 text-white scale-105"
                : "bg-white hover:bg-gray-100 shadow"
            }`}
          >
            4x4
          </button>
          <button
            onClick={() => {
              if (gridSize !== 6) {
                setGridSize(6);
                // Start new game with 6x6 grid
                const { types, puzzleGrid, puzzleSolution, tiles } = generateGameState(6, difficulty);
                setActiveTypes(types);
                setGrid(puzzleGrid);
                setSolution(puzzleSolution);
                setAvailableTiles(tiles);
                setSelectedTile(null);
                setGameWon(false);
                setTimer(0);
                setIsPlaying(true);
                setMessage(null);
                setHighlightedType(null);
                if (timerRef.current) clearInterval(timerRef.current);
                playSound('click');
              }
            }}
            className={`px-4 py-2 rounded-full font-bold transition-all ${
              gridSize === 6
                ? "bg-indigo-600 text-white scale-105"
                : "bg-white hover:bg-gray-100 shadow"
            }`}
          >
            6x6
          </button>
        </div>

        {/* Difficulty */}
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 font-medium">Level:</span>
          {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                if (difficulty !== d) {
                  setDifficulty(d);
                  // Start new game with new difficulty
                  const { types, puzzleGrid, puzzleSolution, tiles } = generateGameState(gridSize, d);
                  setActiveTypes(types);
                  setGrid(puzzleGrid);
                  setSolution(puzzleSolution);
                  setAvailableTiles(tiles);
                  setSelectedTile(null);
                  setGameWon(false);
                  setTimer(0);
                  setIsPlaying(true);
                  setMessage(null);
                  setHighlightedType(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                  playSound('click');
                }
              }}
              className={`px-4 py-2 rounded-full font-bold transition-all ${
                difficulty === d
                  ? "bg-indigo-600 text-white scale-105"
                  : "bg-white hover:bg-gray-100 shadow"
              }`}
            >
              {DIFFICULTY_SETTINGS[d].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer and Controls */}
      <div className="flex justify-center gap-4 mb-6">
        <div className="bg-white px-6 py-2 rounded-full shadow flex items-center gap-2">
          <span className="text-2xl">T</span>
          <span className="font-mono font-bold text-xl text-indigo-600">
            {formatTime(timer)}
          </span>
        </div>
        <button
          onClick={initializeGame}
          className="bg-green-500 text-white px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-colors shadow"
        >
          New Game
        </button>
        <button
          onClick={checkSolution}
          className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-600 transition-colors shadow"
        >
          Check
        </button>
      </div>

      {/* Type Legend */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {activeTypes.map(type => (
          <div
            key={type}
            className={`px-3 py-1 rounded-full text-white font-medium text-sm flex items-center gap-1 ${getTypeColor(type)} ${
              highlightedType === type ? "ring-2 ring-yellow-400 ring-offset-2" : ""
            }`}
          >
            <span>{typeEmojis[type]}</span>
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Game Grid */}
      <div className="flex justify-center mb-8">
        <div className={`grid ${gridColsClass} gap-1 p-4 bg-white rounded-2xl shadow-xl`}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`
                  ${cellSizeClass} rounded-xl flex items-center justify-center cursor-pointer
                  transition-all duration-200
                  ${cell.isFixed
                    ? "bg-slate-200 cursor-not-allowed"
                    : cell.hasConflict
                      ? "bg-red-100 ring-2 ring-red-500"
                      : cell.pokemon
                        ? "bg-slate-100 hover:bg-slate-200"
                        : "bg-slate-50 hover:bg-indigo-50 border-2 border-dashed border-slate-300"
                  }
                  ${!cell.isFixed && selectedTile ? "hover:ring-2 hover:ring-indigo-400" : ""}
                `}
              >
                {cell.pokemon ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                      src={`/pokemon/${cell.pokemon.id}.png`}
                      alt={cell.pokemon.name}
                      width={gridSize === 4 ? 64 : 48}
                      height={gridSize === 4 ? 64 : 48}
                      className={`${cell.isFixed ? "opacity-90" : ""}`}
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${getTypeColor(cell.pokemon.types[0])}`}
                      title={cell.pokemon.types[0]}
                    />
                  </div>
                ) : (
                  <span className="text-slate-300 text-2xl">+</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Available Tiles */}
      <div className="max-w-2xl mx-auto px-4">
        <h3 className="text-center text-gray-600 font-medium mb-3">
          Available Pokemon ({availableTiles.length} remaining)
        </h3>
        <div className="flex flex-wrap justify-center gap-2 p-4 bg-white rounded-2xl shadow-lg min-h-[100px]">
          {availableTiles.length === 0 && !gameWon && (
            <p className="text-gray-400 italic">All tiles placed!</p>
          )}
          {availableTiles.map((poke) => (
            <div
              key={poke.id}
              onClick={() => handleTileClick(poke)}
              className={`
                ${tileSizeClass} rounded-xl flex items-center justify-center cursor-pointer
                transition-all duration-200 relative
                ${selectedTile?.id === poke.id
                  ? "ring-4 ring-indigo-500 scale-110 bg-indigo-100"
                  : "bg-slate-100 hover:bg-slate-200 hover:scale-105"
                }
              `}
              title={`${poke.name} (${poke.types[0]})`}
            >
              <Image
                src={`/pokemon/${poke.id}.png`}
                alt={poke.name}
                width={gridSize === 4 ? 52 : 44}
                height={gridSize === 4 ? 52 : 44}
              />
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getTypeColor(poke.types[0])}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-xl mx-auto mt-8 px-4">
        <div className="bg-white/80 rounded-xl p-4 text-center text-sm text-gray-600">
          <p className="font-medium text-indigo-600 mb-2">How to Play</p>
          <ul className="space-y-1">
            <li>1. Click a Pokemon tile below to select it</li>
            <li>2. Click an empty cell in the grid to place it</li>
            <li>3. Each row and column must have exactly one of each type</li>
            <li>4. Red highlighted cells have type conflicts</li>
          </ul>
        </div>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl animate-bounce-slow">
            <div className="text-6xl mb-4">STAR</div>
            <h2 className="text-3xl font-bold text-indigo-600 mb-2">
              Puzzle Complete!
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Amazing work, {playerName}!
            </p>
            <p className="text-lg text-gray-500 mb-6">
              Time: <span className="font-bold text-indigo-600">{formatTime(timer)}</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={initializeGame}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-indigo-700 transition-colors"
              >
                Play Again!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
