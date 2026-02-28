"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { pokemon as allPokemon, Pokemon, typeColors } from "@/data/pokemon";
import { playSound, preloadCommonSounds } from "@/lib/sounds";
import { speak, celebrateWin, loadVoices } from "@/lib/speech";
import { usePlayer } from "@/lib/player";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Filter Pokemon with clean names (no hyphens, dots, spaces, apostrophes)
const cleanPokemon = allPokemon.filter(
  (p) => /^[a-zA-Z]+$/.test(p.name) && p.name.length >= 3
);

// Tiered pools by name length
const tier1 = cleanPokemon.filter((p) => p.name.length <= 4);
const tier2 = cleanPokemon.filter(
  (p) => p.name.length >= 5 && p.name.length <= 6
);
const tier3 = cleanPokemon.filter(
  (p) => p.name.length >= 7 && p.name.length <= 8
);
const tier4 = cleanPokemon.filter((p) => p.name.length >= 9);

function getPoolForLevel(level: number): Pokemon[] {
  if (level <= 3) return tier1.length > 0 ? tier1 : tier2;
  if (level <= 6) return [...tier1, ...tier2];
  if (level <= 10) return [...tier1, ...tier2, ...tier3];
  return [...tier1, ...tier2, ...tier3, ...tier4];
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Interfaces
interface FallingBlock {
  id: number;
  pokemon: Pokemon;
  x: number;
  y: number;
  speed: number;
  status: "falling" | "targeted" | "clearing" | "fading";
  typedChars: number;
  opacity: number;
  scale: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

// Game constants
const GRID_COLS = 5;
const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 130;
const GAME_WIDTH = 640;
const GAME_HEIGHT = 520;

function getSpeedForLevel(level: number): number {
  return 0.3 + level * 0.08;
}

function getSpawnInterval(level: number): number {
  return Math.max(1200, 4000 - level * 250);
}

function getMaxBlocks(level: number): number {
  return Math.min(6, 3 + Math.floor(level / 3));
}

export default function TypeFallPage() {
  const [blocks, setBlocks] = useState<FallingBlock[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [totalMissed, setTotalMissed] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    emoji: string;
  } | null>(null);
  const [multiplierPopup, setMultiplierPopup] = useState<string | null>(null);

  const { name: playerName } = usePlayer();

  const blockIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearedCountRef = useRef(0);
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const blocksRef = useRef<FallingBlock[]>([]);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("pokemonTypeFallHighScore");
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      highScoreRef.current = val;
    }
    preloadCommonSounds();
    loadVoices();
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      highScoreRef.current = score;
      localStorage.setItem("pokemonTypeFallHighScore", score.toString());
    }
  }, [score, highScore]);

  // Find the targeted (lowest) block
  const getTargetBlock = useCallback(
    (currentBlocks: FallingBlock[]): FallingBlock | null => {
      const active = currentBlocks.filter(
        (b) => b.status === "falling" || b.status === "targeted"
      );
      if (active.length === 0) return null;
      return active.reduce((lowest, b) =>
        b.y + BLOCK_HEIGHT > lowest.y + BLOCK_HEIGHT ? b : lowest
      );
    },
    []
  );

  // Spawn a new block
  const spawnBlock = useCallback(() => {
    const pool = getPoolForLevel(levelRef.current);
    const poke = randomFrom(pool);

    // Pick a column that doesn't overlap with existing blocks near the top
    const existingTopCols = blocksRef.current
      .filter((b) => b.y < BLOCK_HEIGHT * 2)
      .map((b) => Math.round(b.x / (GAME_WIDTH / GRID_COLS)));

    let col: number;
    let attempts = 0;
    do {
      col = Math.floor(Math.random() * GRID_COLS);
      attempts++;
    } while (existingTopCols.includes(col) && attempts < 10);

    const x = col * (GAME_WIDTH / GRID_COLS) + (GAME_WIDTH / GRID_COLS - BLOCK_WIDTH) / 2;

    const newBlock: FallingBlock = {
      id: blockIdRef.current++,
      pokemon: poke,
      x,
      y: -BLOCK_HEIGHT,
      speed: getSpeedForLevel(levelRef.current),
      status: "falling",
      typedChars: 0,
      opacity: 1,
      scale: 1,
    };

    setBlocks((prev) => {
      if (
        prev.filter((b) => b.status === "falling" || b.status === "targeted")
          .length >= getMaxBlocks(levelRef.current)
      ) {
        return prev;
      }
      return [...prev, newBlock];
    });
  }, []);

  // Spawn particles on clear
  const spawnParticles = useCallback(
    (x: number, y: number, pokemon: Pokemon) => {
      const color = typeColors[pokemon.types[0]] || "#FFD700";
      const newParticles: Particle[] = [];
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        newParticles.push({
          id: particleIdRef.current++,
          x: x + BLOCK_WIDTH / 2,
          y: y + BLOCK_HEIGHT / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: 4 + Math.random() * 6,
          life: 1,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    },
    []
  );

  // Spawn fade particles on miss
  const spawnFadeParticles = useCallback(
    (x: number, y: number) => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 6; i++) {
        newParticles.push({
          id: particleIdRef.current++,
          x: x + BLOCK_WIDTH / 2 + (Math.random() - 0.5) * 40,
          y: y + BLOCK_HEIGHT / 2,
          vx: (Math.random() - 0.5) * 1,
          vy: -0.5 - Math.random(),
          color: "#94a3b8",
          size: 3 + Math.random() * 3,
          life: 0.8,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    },
    []
  );

  // Game loop
  useEffect(() => {
    if (!gameStarted) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      const delta = Math.min((currentTime - lastTimeRef.current) / 16, 3);
      lastTimeRef.current = currentTime;

      // Update blocks
      setBlocks((prev) => {
        let updated = prev.map((block) => {
          if (block.status === "falling" || block.status === "targeted") {
            return { ...block, y: block.y + block.speed * delta };
          }
          if (block.status === "clearing") {
            const newScale = block.scale + 0.05 * delta;
            const newOpacity = block.opacity - 0.06 * delta;
            return {
              ...block,
              scale: newScale,
              opacity: Math.max(0, newOpacity),
            };
          }
          if (block.status === "fading") {
            return { ...block, opacity: Math.max(0, block.opacity - 0.02 * delta) };
          }
          return block;
        });

        // Check blocks that hit bottom
        const hitBottom: FallingBlock[] = [];
        updated = updated.map((block) => {
          if (
            (block.status === "falling" || block.status === "targeted") &&
            block.y + BLOCK_HEIGHT >= GAME_HEIGHT
          ) {
            hitBottom.push(block);
            return { ...block, status: "fading" as const, y: GAME_HEIGHT - BLOCK_HEIGHT };
          }
          return block;
        });

        if (hitBottom.length > 0) {
          playSound("bounce", { volume: 0.3 });
          setTotalMissed((m) => m + hitBottom.length);
          // Reset typed text if the targeted block was missed
          const target = getTargetBlock(prev);
          if (target && hitBottom.some((b) => b.id === target.id)) {
            setTypedText("");
          }
          hitBottom.forEach((b) => spawnFadeParticles(b.x, b.y));
        }

        // Remove fully cleared/faded blocks
        updated = updated.filter(
          (b) =>
            !(b.status === "clearing" && b.opacity <= 0) &&
            !(b.status === "fading" && b.opacity <= 0)
        );

        // Update target status
        const target = getTargetBlock(updated);
        updated = updated.map((b) => {
          if (b.status === "falling" || b.status === "targeted") {
            return {
              ...b,
              status: target && b.id === target.id ? "targeted" as const : "falling" as const,
            };
          }
          return b;
        });

        return updated;
      });

      // Update particles
      setParticles((prev) => {
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * delta,
            y: p.y + p.vy * delta,
            vy: p.vy + 0.15 * delta,
            life: p.life - 0.025 * delta,
            size: p.size * (1 - 0.01 * delta),
          }))
          .filter((p) => p.life > 0);
      });

      gameLoopRef.current = requestAnimationFrame(animate);
    };

    gameLoopRef.current = requestAnimationFrame(animate);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, getTargetBlock, spawnFadeParticles]);

  // Spawn timer
  useEffect(() => {
    if (!gameStarted) return;

    const scheduleSpawn = () => {
      spawnTimerRef.current = setTimeout(() => {
        spawnBlock();
        scheduleSpawn();
      }, getSpawnInterval(levelRef.current));
    };

    // Initial spawn
    spawnBlock();
    setTimeout(() => spawnBlock(), 800);
    scheduleSpawn();

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [gameStarted, spawnBlock]);

  // Visibility change — pause/resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = 0;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Handle typing
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toLowerCase();
      const currentBlocks = blocksRef.current;
      const target = getTargetBlock(currentBlocks);
      if (!target) return;

      const name = target.pokemon.name.toLowerCase();

      // Check if the typed text matches the prefix of the name
      if (name.startsWith(value)) {
        setTypedText(value);
        // Update typed chars on the block
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === target.id ? { ...b, typedChars: value.length } : b
          )
        );

        if (value.length > 0) {
          // Play click with rising pitch
          playSound("click", {
            rate: 0.8 + (value.length / name.length) * 0.8,
            volume: 0.5,
          });
        }

        // Check if fully typed
        if (value === name) {
          // Clear the block!
          const currentStreak = streakRef.current + 1;
          streakRef.current = currentStreak;
          setStreak(currentStreak);
          if (currentStreak > bestStreak) setBestStreak(currentStreak);

          // Score calculation
          const basePoints = name.length * 10;
          const heightRatio = target.y / GAME_HEIGHT;
          const heightMultiplier =
            heightRatio < 0.33 ? 3 : heightRatio < 0.66 ? 2 : 1;
          const streakMultiplier = Math.min(
            5,
            1 + Math.floor(currentStreak / 3)
          );
          const points = basePoints * heightMultiplier * streakMultiplier;

          setScore((prev) => prev + points);

          // Show multiplier popup
          if (streakMultiplier > 1 || heightMultiplier > 1) {
            const parts: string[] = [];
            if (heightMultiplier > 1) parts.push(`${heightMultiplier}x height`);
            if (streakMultiplier > 1)
              parts.push(`${streakMultiplier}x streak`);
            setMultiplierPopup(`+${points} (${parts.join(" + ")})`);
            setTimeout(() => setMultiplierPopup(null), 1500);
          }

          // Sound based on streak
          if (currentStreak >= 10) {
            playSound("streak", { volume: 0.8 });
          } else if (currentStreak >= 5) {
            playSound("combo", { volume: 0.7 });
          } else {
            playSound("success", { volume: 0.6 });
          }

          // Speech milestones
          if (currentStreak === 5) {
            speak(`Nice streak, ${playerName}!`, { rate: 1.1, pitch: 1.2 });
          } else if (currentStreak === 10) {
            speak(`Ten in a row! ${playerName} is on fire!`, {
              rate: 1.2,
              pitch: 1.3,
            });
          } else if (currentStreak === 20) {
            speak(`Unstoppable! Twenty streak for ${playerName}!`, {
              rate: 1.3,
              pitch: 1.4,
            });
          }

          // Legendary announcement
          if (target.pokemon.is_legendary || target.pokemon.is_mythical) {
            setTimeout(() => {
              speak(
                `Legendary! ${playerName} typed ${target.pokemon.name}!`,
                { rate: 0.9, pitch: 0.8 }
              );
            }, 300);
          }

          // Spawn particles and set clearing
          spawnParticles(target.x, target.y, target.pokemon);
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === target.id ? { ...b, status: "clearing" as const } : b
            )
          );

          // Update cleared count and check level up
          clearedCountRef.current += 1;
          setTotalCleared((c) => c + 1);

          if (clearedCountRef.current % 5 === 0) {
            const newLevel = Math.floor(clearedCountRef.current / 5) + 1;
            levelRef.current = newLevel;
            setLevel(newLevel);
            playSound("powerup", { volume: 0.7 });
            speak(`Level ${newLevel}!`, { rate: 1.1, pitch: 1.2 });

            const msg = getQuickPersonalizedMessage(playerName, "level_up");
            setFeedbackMessage({ text: msg.message, emoji: msg.emoji });
            setTimeout(() => setFeedbackMessage(null), 2000);
          }

          // High score check
          if (scoreRef.current + points > highScoreRef.current && highScoreRef.current > 0) {
            setTimeout(() => {
              playSound("win", { volume: 0.8 });
            }, 200);
          }

          setTypedText("");
        }
      } else {
        // Wrong key — flash and reject
        setErrorFlash(true);
        playSound("error", { volume: 0.4, rate: 1.2 });
        setTimeout(() => setErrorFlash(false), 200);
        // Don't update typedText — keep old value
      }
    },
    [getTargetBlock, playerName, bestStreak, spawnParticles]
  );

  // Start game
  const startGame = useCallback(() => {
    setBlocks([]);
    setParticles([]);
    setScore(0);
    setLevel(1);
    setStreak(0);
    setBestStreak(0);
    setTotalCleared(0);
    setTotalMissed(0);
    setTypedText("");
    setErrorFlash(false);
    setFeedbackMessage(null);
    setMultiplierPopup(null);
    blockIdRef.current = 0;
    particleIdRef.current = 0;
    lastTimeRef.current = 0;
    clearedCountRef.current = 0;
    levelRef.current = 1;
    streakRef.current = 0;
    scoreRef.current = 0;

    playSound("powerup");
    speak(`Let's go, ${playerName}! Type the names!`, {
      rate: 1.0,
      pitch: 1.1,
    });

    setGameStarted(true);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [playerName]);

  // Keep input focused during gameplay
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      if (
        document.activeElement !== inputRef.current &&
        !document.hidden
      ) {
        inputRef.current?.focus();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameStarted]);

  // Current target for display
  const targetBlock = getTargetBlock(blocks);
  const targetName = targetBlock?.pokemon.name.toLowerCase() || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center overflow-hidden">
      {/* Header stats */}
      <div className="w-full max-w-[680px] px-4 pt-4 pb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 mb-3">
          Type Fall
        </h1>

        {gameStarted && (
          <div className="flex justify-center gap-2 flex-wrap text-sm">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-4 py-1.5 rounded-full">
              <span className="text-yellow-400 font-bold">
                {score.toLocaleString()}
              </span>
              <span className="text-slate-400 ml-1">pts</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-4 py-1.5 rounded-full">
              <span className="text-cyan-400 font-bold">Lv {level}</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-4 py-1.5 rounded-full">
              <span className="text-orange-400 font-bold">{streak}</span>
              <span className="text-slate-400 ml-1">streak</span>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-4 py-1.5 rounded-full">
              <span className="text-emerald-400 font-bold">
                {totalCleared}
              </span>
              <span className="text-slate-400 ml-1">cleared</span>
            </div>
          </div>
        )}
      </div>

      {/* Game area */}
      <div
        className="relative border border-slate-700/50 rounded-xl overflow-hidden mx-4"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          maxWidth: "calc(100vw - 2rem)",
          background:
            "linear-gradient(180deg, rgba(30,27,75,0.8) 0%, rgba(15,23,42,0.95) 100%)",
        }}
      >
        {/* Subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
            <div
              key={`col-${i}`}
              className="absolute top-0 bottom-0 w-px bg-slate-700/20"
              style={{ left: (i * GAME_WIDTH) / GRID_COLS }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="absolute left-0 right-0 h-px bg-slate-700/15"
              style={{ top: (i + 1) * (GAME_HEIGHT / 5) }}
            />
          ))}
        </div>

        {/* Falling blocks */}
        {blocks.map((block) => {
          const isTarget = block.status === "targeted";
          const primaryType = block.pokemon.types[0];
          const color = typeColors[primaryType] || "#6366f1";

          return (
            <div
              key={block.id}
              className="absolute transition-none"
              style={{
                left: block.x,
                top: block.y,
                width: BLOCK_WIDTH,
                height: BLOCK_HEIGHT,
                opacity: block.opacity,
                transform: `scale(${block.scale})`,
                zIndex: isTarget ? 20 : 10,
              }}
            >
              <div
                className={`w-full h-full rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden
                  ${isTarget ? "border-yellow-400" : "border-slate-600/60"}`}
                style={{
                  background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                  boxShadow: isTarget
                    ? `0 0 20px ${color}44, 0 0 40px rgba(250,204,21,0.2), inset 0 0 15px ${color}11`
                    : `0 0 10px ${color}22, inset 0 0 8px ${color}08`,
                }}
              >
                {/* Pulse ring for target */}
                {isTarget && (
                  <div
                    className="absolute inset-0 rounded-xl border-2 border-yellow-400/60 animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                )}

                {/* Pokemon sprite */}
                <div className="relative w-14 h-14">
                  <Image
                    src={`/pokemon/${block.pokemon.id}.png`}
                    alt={block.pokemon.name}
                    width={56}
                    height={56}
                    className="drop-shadow-lg pointer-events-none"
                    draggable={false}
                  />
                </div>

                {/* Name with typed chars highlighted */}
                <div className="flex gap-px mt-0.5">
                  {block.pokemon.name
                    .toLowerCase()
                    .split("")
                    .map((char, i) => (
                      <span
                        key={i}
                        className={`text-xs font-bold font-mono leading-none ${
                          i < block.typedChars
                            ? "text-emerald-400"
                            : isTarget &&
                                i === block.typedChars
                              ? "text-yellow-300"
                              : "text-slate-400"
                        }`}
                      >
                        {char}
                      </span>
                    ))}
                </div>

                {/* Type badge */}
                <div
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 text-white/80"
                  style={{ backgroundColor: color + "66" }}
                >
                  {primaryType}
                </div>
              </div>
            </div>
          );
        })}

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
            }}
          />
        ))}

        {/* Feedback message */}
        {feedbackMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur px-6 py-2 rounded-full shadow-xl animate-bounce">
              <span className="text-lg font-bold text-white">
                {feedbackMessage.emoji} {feedbackMessage.text}
              </span>
            </div>
          </div>
        )}

        {/* Multiplier popup */}
        {multiplierPopup && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
            <span className="text-yellow-300 font-bold text-lg drop-shadow-lg bg-black/40 px-3 py-1 rounded-full">
              {multiplierPopup}
            </span>
          </div>
        )}

        {/* Start screen overlay */}
        {!gameStarted && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
              <div className="mb-4">
                <Image
                  src="/pokemon/151.png"
                  alt="Mew"
                  width={96}
                  height={96}
                  className="mx-auto drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                />
              </div>

              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 mb-3">
                Type Fall
              </h2>

              <div className="text-left text-slate-300 text-sm space-y-2 mb-5 bg-slate-800/50 rounded-xl p-4">
                <p>
                  Pokemon blocks fall from the sky.
                </p>
                <p>
                  Type each name to clear it before it reaches the bottom.
                </p>
                <p>
                  The lowest block is auto-targeted with a golden glow.
                </p>
                <p>
                  No game over — missed blocks just fade away!
                </p>
              </div>

              {highScore > 0 && (
                <p className="text-yellow-400 font-bold text-lg mb-4">
                  High Score: {highScore.toLocaleString()}
                </p>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500
                           text-white font-bold text-xl py-3 px-8 rounded-xl
                           transition-all transform hover:scale-105 active:scale-95
                           shadow-lg shadow-indigo-500/30"
              >
                Start Typing!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      {gameStarted && (
        <div className="w-full max-w-[680px] px-4 mt-4 space-y-3">
          {/* Text input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={typedText}
              onChange={handleInput}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={
                targetBlock
                  ? `Type: ${targetBlock.pokemon.name}`
                  : "Waiting for blocks..."
              }
              className={`w-full text-center text-2xl py-3 px-6 rounded-xl font-mono
                bg-slate-800 border-2 text-white placeholder-slate-500
                focus:outline-none transition-colors
                ${
                  errorFlash
                    ? "border-red-500 bg-red-900/30"
                    : "border-slate-600 focus:border-indigo-400"
                }`}
            />
            {errorFlash && (
              <div className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-50 pointer-events-none" />
            )}
          </div>

          {/* Letter tiles */}
          {targetBlock && (
            <div className="flex justify-center gap-1.5">
              {targetName.split("").map((char, i) => {
                const isTyped = i < typedText.length;
                const isNext = i === typedText.length;

                return (
                  <div
                    key={i}
                    className={`w-9 h-11 rounded-lg flex items-center justify-center font-mono font-bold text-lg
                      border-2 transition-all duration-150
                      ${
                        isTyped
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-95"
                          : isNext
                            ? "bg-yellow-500/10 border-yellow-400 text-yellow-300 animate-pulse"
                            : "bg-slate-800/50 border-slate-700 text-slate-500"
                      }`}
                  >
                    {char.toUpperCase()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom stats row */}
          <div className="flex justify-between text-xs text-slate-500 px-1">
            <span>Best Streak: {bestStreak}</span>
            <span>Missed: {totalMissed}</span>
            <span>
              High Score: {highScore.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
