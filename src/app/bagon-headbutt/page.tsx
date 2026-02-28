"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { pokemon, pokemonByName } from "@/data/pokemon";
import { usePlayer } from "@/lib/player";
import { playSound, preloadCommonSounds } from "@/lib/sounds";
import { speak, loadVoices } from "@/lib/speech";
import { getQuickPersonalizedMessage } from "@/lib/ai";

// Get Bagon from the database
const bagon = pokemonByName.get("Bagon") || pokemon.find(p => p.name === "Bagon") || pokemon[370];

// Target Pokemon (cute, varied sizes - excluding legendary/mythical for easier gameplay)
const targetPokemon = pokemon.filter(p =>
  !p.is_legendary &&
  !p.is_mythical &&
  p.id !== bagon.id &&
  p.id <= 493 // Gen 1-4 for familiarity
).slice(0, 200);

// Game constants
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 500;
const GROUND_Y = 420;
const BAGON_SIZE = 80;
const BAGON_START_X = 150;
const GRAVITY = 0.8;
const JUMP_POWER = -2.5; // Continuous upward thrust while holding
const DIVE_SPEED_X = 8; // Horizontal dive speed
const DIVE_SPEED_Y = 12; // Vertical dive speed
const MAX_RISE_SPEED = -12; // Terminal velocity going up
const TARGET_SPEED_BASE = 4;
const SPAWN_INTERVAL_BASE = 1800;
const CEILING_Y = 30; // Top boundary

// Commentary messages
const hitMessages = [
  "HEADBUTT! 💥",
  "BONK! 🌟",
  "SMASH! ⭐",
  "POW! 💫",
  "WHAM! 🔥",
  "SKULL BASH! 💀",
  "CRITICAL HIT! ⚡",
];

const missMessages = [
  "Missed! 😅",
  "So close! 💨",
  "Almost! 🎯",
  "Try again! 💪",
];

const streakMessages = [
  "On fire! 🔥",
  "Unstoppable! ⚡",
  "Combo master! 🌟",
  "Rampage! 💥",
  "Legendary! 👑",
];

interface Target {
  id: number;
  pokemon: typeof pokemon[0];
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  hit: boolean;
  size: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: "star" | "dust" | "sparkle";
  color: string;
}

interface CloudData {
  id: number;
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
}

interface MountainData {
  id: number;
  x: number;
  height: number;
  width: number;
  color: string;
  zIndex: number;
}

interface TreeData {
  id: number;
  x: number;
  type: "pine" | "oak" | "bush";
  scale: number;
}

export default function BagonHeadbuttPage() {
  const { name: playerName } = usePlayer();

  // Game state
  const [gameState, setGameState] = useState<"menu" | "playing">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalHits, setTotalHits] = useState(0);

  // Bagon state
  const [bagonX, setBagonX] = useState(BAGON_START_X);
  const [bagonY, setBagonY] = useState(GROUND_Y - BAGON_SIZE);
  const [bagonVX, setBagonVX] = useState(0);
  const [bagonVY, setBagonVY] = useState(0);
  const [bagonRotation, setBagonRotation] = useState(0);
  const [isDiving, setIsDiving] = useState(false);
  const [isHoldingSpace, setIsHoldingSpace] = useState(false);
  const [isOnGround, setIsOnGround] = useState(true);
  const [bagonState, setBagonState] = useState<"idle" | "rising" | "diving" | "landing">("idle");

  // Targets and effects
  const [targets, setTargets] = useState<Target[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [commentary, setCommentary] = useState("");
  const [showCombo, setShowCombo] = useState(false);
  const [currentPokemonName, setCurrentPokemonName] = useState("");

  // Landscape
  const [clouds, setClouds] = useState<CloudData[]>([]);
  const [mountains, setMountains] = useState<MountainData[]>([]);
  const [trees, setTrees] = useState<TreeData[]>([]);

  // Refs
  const gameRef = useRef<HTMLDivElement>(null);
  const nextTargetId = useRef(0);
  const nextParticleId = useRef(0);
  const lastSpawnTime = useRef(0);
  const animationRef = useRef<number>(0);

  // Physics refs for immediate access in game loop
  const bagonYRef = useRef(GROUND_Y - BAGON_SIZE);
  const bagonXRef = useRef(BAGON_START_X);
  const bagonVYRef = useRef(0);
  const bagonVXRef = useRef(0);
  const isHoldingSpaceRef = useRef(false);
  const isDivingRef = useRef(false);
  const isOnGroundRef = useRef(true);

  // Initialize landscape
  useEffect(() => {
    // Generate clouds - spread across full width and beyond for seamless scrolling
    const newClouds: CloudData[] = [];
    for (let i = 0; i < 12; i++) {
      newClouds.push({
        id: i,
        x: (i * 120) - 100, // Spread evenly across and beyond game width
        y: 20 + Math.random() * 120,
        speed: 0.3 + Math.random() * 0.4,
        scale: 0.5 + Math.random() * 0.7,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
    setClouds(newClouds);

    // Generate mountains
    const newMountains: MountainData[] = [];
    const colors = ["#6B7280", "#4B5563", "#374151", "#1F2937"];
    for (let i = 0; i < 6; i++) {
      newMountains.push({
        id: i,
        x: i * 200 - 50,
        height: 120 + Math.random() * 100,
        width: 180 + Math.random() * 120,
        color: colors[Math.floor(Math.random() * colors.length)],
        zIndex: Math.floor(Math.random() * 3),
      });
    }
    setMountains(newMountains.sort((a, b) => a.zIndex - b.zIndex));

    // Generate trees
    const newTrees: TreeData[] = [];
    for (let i = 0; i < 12; i++) {
      newTrees.push({
        id: i,
        x: i * 90 + Math.random() * 40,
        type: ["pine", "oak", "bush"][Math.floor(Math.random() * 3)] as "pine" | "oak" | "bush",
        scale: 0.7 + Math.random() * 0.5,
      });
    }
    setTrees(newTrees);

    // Load sounds and voices
    preloadCommonSounds();
    loadVoices();

    // Load high score
    const saved = localStorage.getItem("bagon_headbutt_highscore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Get random target Pokemon
  const getRandomTarget = useCallback(() => {
    return targetPokemon[Math.floor(Math.random() * targetPokemon.length)];
  }, []);

  // Create particles
  const createParticles = useCallback((x: number, y: number, type: "hit" | "miss" | "land") => {
    const newParticles: Particle[] = [];
    const count = type === "hit" ? 12 : type === "land" ? 5 : 3;
    const colors = type === "hit"
      ? ["#FFD700", "#FFA500", "#FF6B6B", "#FFE66D"]
      : type === "land"
      ? ["#8B4513", "#A0522D", "#CD853F"]
      : ["#87CEEB", "#ADD8E6"];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 3 + Math.random() * 4;
      newParticles.push({
        id: nextParticleId.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "hit" ? 3 : 0),
        life: 30 + Math.random() * 20,
        type: type === "hit" ? "star" : type === "land" ? "dust" : "sparkle",
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setParticles(prev => [...prev.slice(-30), ...newParticles]);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLevel(1);
    setTotalHits(0);
    setTargets([]);
    setParticles([]);
    setBagonX(BAGON_START_X);
    setBagonY(GROUND_Y - BAGON_SIZE);
    setBagonVX(0);
    setBagonVY(0);
    setIsDiving(false);
    setIsHoldingSpace(false);
    setIsOnGround(true);
    setBagonState("idle");
    setBagonRotation(0);
    lastSpawnTime.current = Date.now();

    // Reset physics refs
    bagonYRef.current = GROUND_Y - BAGON_SIZE;
    bagonXRef.current = BAGON_START_X;
    bagonVYRef.current = 0;
    bagonVXRef.current = 0;
    isHoldingSpaceRef.current = false;
    isDivingRef.current = false;
    isOnGroundRef.current = true;

    playSound("powerup", { volume: 0.7 });
    speak(`Let's go ${playerName}! Headbutt those Pokemon!`, { rate: 1.1, pitch: 1.2 });
    setCommentary("GO! 🚀");

    gameRef.current?.focus();
  }, [playerName]);

  // Handle space press (start rising)
  const handleSpaceDown = useCallback(() => {
    if (gameState !== "playing") return;
    if (isDivingRef.current) return; // Can't rise while diving

    if (!isHoldingSpaceRef.current) {
      isHoldingSpaceRef.current = true;
      isOnGroundRef.current = false;
      setIsHoldingSpace(true);
      setIsOnGround(false);
      setBagonState("rising");
      playSound("whoosh", { volume: 0.4 });
    }
  }, [gameState]);

  // Handle space release (start diving)
  const handleSpaceUp = useCallback(() => {
    if (gameState !== "playing") return;

    if (isHoldingSpaceRef.current && !isOnGroundRef.current) {
      isHoldingSpaceRef.current = false;
      isDivingRef.current = true;
      bagonVXRef.current = DIVE_SPEED_X;
      bagonVYRef.current = DIVE_SPEED_Y;

      setIsHoldingSpace(false);
      setIsDiving(true);
      setBagonState("diving");
      setBagonVX(DIVE_SPEED_X);
      setBagonVY(DIVE_SPEED_Y);
      playSound("whoosh", { volume: 0.7, rate: 1.3 });
    } else {
      isHoldingSpaceRef.current = false;
      setIsHoldingSpace(false);
    }
  }, [gameState]);

  // Handle key press
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (e.repeat) return; // Ignore key repeat

      if (gameState === "menu") {
        startGame();
      } else {
        handleSpaceDown();
      }
    }
  }, [gameState, handleSpaceDown, startGame]);

  // Handle key release
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      handleSpaceUp();
    }
  }, [handleSpaceUp]);

  // Handle touch/click (tap to rise, release to dive)
  const handleTouchStart = useCallback(() => {
    if (gameState === "menu") {
      startGame();
    } else {
      handleSpaceDown();
    }
  }, [gameState, handleSpaceDown, startGame]);

  const handleTouchEnd = useCallback(() => {
    if (gameState === "playing") {
      handleSpaceUp();
    }
  }, [gameState, handleSpaceUp]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Game loop - uses refs for physics to avoid stale state
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      const now = Date.now();
      const spawnInterval = Math.max(800, SPAWN_INTERVAL_BASE - level * 150);
      const targetSpeed = TARGET_SPEED_BASE + level * 0.5;

      // Spawn new targets from the RIGHT, moving LEFT
      if (now - lastSpawnTime.current > spawnInterval) {
        const poke = getRandomTarget();
        const size = 50 + Math.min(poke.height, 30);

        setTargets(prev => [...prev, {
          id: nextTargetId.current++,
          pokemon: poke,
          x: GAME_WIDTH + size, // Start from right
          y: GROUND_Y - size - Math.random() * 80,
          speed: targetSpeed + Math.random() * 2,
          direction: -1, // Moving left
          hit: false,
          size,
        }]);

        // Announce the Pokemon
        setCurrentPokemonName(poke.name);
        speak(`Wild ${poke.name}!`, { rate: 1.1, pitch: 1.2 });

        // Clear name after a moment
        setTimeout(() => setCurrentPokemonName(""), 2000);

        lastSpawnTime.current = now;
      }

      // Physics using refs for immediate access
      if (isHoldingSpaceRef.current && !isDivingRef.current) {
        // Rising while holding space - apply upward thrust
        bagonVYRef.current = Math.max(MAX_RISE_SPEED, bagonVYRef.current + JUMP_POWER);

        // Update Y position
        bagonYRef.current = bagonYRef.current + bagonVYRef.current;

        // Ceiling collision
        if (bagonYRef.current < CEILING_Y) {
          bagonYRef.current = CEILING_Y;
          bagonVYRef.current = 0;
        }

        // Sync to state for rendering
        setBagonY(bagonYRef.current);
        setBagonVY(bagonVYRef.current);
      } else if (isDivingRef.current) {
        // Diving diagonally
        bagonYRef.current = bagonYRef.current + bagonVYRef.current;
        bagonXRef.current = bagonXRef.current + bagonVXRef.current;

        // Keep X within bounds
        bagonXRef.current = Math.min(GAME_WIDTH - BAGON_SIZE, Math.max(0, bagonXRef.current));

        // Sync to state
        setBagonY(bagonYRef.current);
        setBagonX(bagonXRef.current);
      }

      // Ground collision
      if (bagonYRef.current >= GROUND_Y - BAGON_SIZE) {
        bagonYRef.current = GROUND_Y - BAGON_SIZE;

        if (!isOnGroundRef.current) {
          isOnGroundRef.current = true;
          isDivingRef.current = false;
          isHoldingSpaceRef.current = false;
          bagonVYRef.current = 0;
          bagonVXRef.current = 0;

          setIsOnGround(true);
          setIsDiving(false);
          setIsHoldingSpace(false);
          setBagonState("landing");
          setBagonVY(0);
          setBagonVX(0);
          setBagonY(bagonYRef.current);
          createParticles(bagonXRef.current + BAGON_SIZE / 2, GROUND_Y, "land");

          // Reset Bagon X position and state after landing
          setTimeout(() => {
            setBagonState("idle");
            bagonXRef.current = BAGON_START_X;
            setBagonX(BAGON_START_X);
          }, 200);
        }
      }

      // Update Bagon rotation
      if (isDivingRef.current) {
        // Rotate to face diagonal down-right (about 45 degrees)
        setBagonRotation(prev => {
          const target = 45;
          if (prev < target) return Math.min(target, prev + 8);
          return target;
        });
      } else if (isHoldingSpaceRef.current) {
        // Slight upward tilt when rising
        setBagonRotation(prev => {
          const target = -15;
          if (prev > target) return Math.max(target, prev - 5);
          return target;
        });
      } else if (isOnGroundRef.current) {
        // Reset rotation on ground
        setBagonRotation(prev => {
          if (Math.abs(prev) < 3) return 0;
          return prev > 0 ? prev - 8 : prev + 8;
        });
      }

      // Update targets (moving left)
      setTargets(prev => {
        const updated = prev.map(target => ({
          ...target,
          x: target.x - target.speed, // Move left
        }));

        // Check for missed targets (went off screen to the left) - just reset combo
        const missed = updated.filter(t => !t.hit && t.x < -100);

        if (missed.length > 0) {
          setCombo(0);
          setCommentary(missMessages[Math.floor(Math.random() * missMessages.length)]);
        }

        // Remove off-screen or hit targets
        return updated.filter(t => t.x > -150 && !t.hit);
      });

      // Check collisions (only when diving)
      if (isDivingRef.current) {
        const bagonCenterX = bagonXRef.current + BAGON_SIZE / 2;
        const bagonCenterY = bagonYRef.current + BAGON_SIZE / 2;
        const bagonRadius = BAGON_SIZE * 0.4;

        setTargets(prev => {
          let hitAny = false;
          const updated = prev.map(target => {
            if (target.hit) return target;

            const targetCenterX = target.x + target.size / 2;
            const targetCenterY = target.y + target.size / 2;
            const targetRadius = target.size * 0.4;

            const dx = bagonCenterX - targetCenterX;
            const dy = bagonCenterY - targetCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bagonRadius + targetRadius) {
              hitAny = true;

              // Score based on combo
              const comboMultiplier = 1 + (combo * 0.2);
              const points = Math.round((10 + level * 2) * comboMultiplier);

              setScore(s => s + points);
              setCombo(c => {
                const newCombo = c + 1;
                setMaxCombo(m => Math.max(m, newCombo));

                if (newCombo > 0 && newCombo % 5 === 0) {
                  setShowCombo(true);
                  playSound("streak", { volume: 0.8 });
                  const msg = getQuickPersonalizedMessage(playerName, "streak", { streak: newCombo });
                  speak(msg.message, { rate: 1.2, pitch: 1.3 });
                  setCommentary(`${newCombo}x COMBO! ${msg.emoji}`);
                  setTimeout(() => setShowCombo(false), 1500);
                }

                return newCombo;
              });
              setTotalHits(h => h + 1);

              // Effects
              createParticles(targetCenterX, targetCenterY, "hit");
              playSound("success", { volume: 0.6, rate: 1 + combo * 0.05 });

              const hitMsg = hitMessages[Math.floor(Math.random() * hitMessages.length)];
              setCommentary(`${hitMsg} +${points}`);

              return { ...target, hit: true };
            }

            return target;
          });

          // Level up every 10 hits
          if (hitAny) {
            setTotalHits(h => {
              if ((h + 1) % 10 === 0) {
                setLevel(l => l + 1);
                playSound("powerup");
                speak(`Level up!`, { rate: 1.1, pitch: 1.2 });
                setCommentary("LEVEL UP! 🆙");
              }
              return h;
            });
          }

          return updated.filter(t => !t.hit);
        });
      }

      // Update particles
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 1,
          }))
          .filter(p => p.life > 0)
      );

      // Update clouds (parallax)
      setClouds(prev => prev.map(cloud => ({
        ...cloud,
        x: cloud.x - cloud.speed,
        ...(cloud.x < -100 ? { x: GAME_WIDTH + 100 } : {}),
      })));

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, combo, level, playerName, createParticles, getRandomTarget]);

  // Save high score automatically when exceeded
  useEffect(() => {
    if (gameState === "playing" && score > highScore) {
      setHighScore(score);
      localStorage.setItem("bagon_headbutt_highscore", String(score));
    }
  }, [gameState, score, highScore]);

  // Render tree based on type
  const renderTree = (tree: TreeData) => {
    const baseY = GROUND_Y - 10;
    switch (tree.type) {
      case "pine":
        return (
          <g key={tree.id} transform={`translate(${tree.x}, ${baseY}) scale(${tree.scale})`}>
            <polygon points="0,-80 -30,0 30,0" fill="#228B22" />
            <polygon points="0,-100 -25,-30 25,-30" fill="#2E8B2E" />
            <polygon points="0,-115 -18,-55 18,-55" fill="#32CD32" />
            <rect x="-6" y="0" width="12" height="20" fill="#8B4513" />
          </g>
        );
      case "oak":
        return (
          <g key={tree.id} transform={`translate(${tree.x}, ${baseY}) scale(${tree.scale})`}>
            <circle cx="0" cy="-60" r="35" fill="#228B22" />
            <circle cx="-25" cy="-45" r="25" fill="#2E8B2E" />
            <circle cx="25" cy="-45" r="25" fill="#2E8B2E" />
            <circle cx="0" cy="-85" r="22" fill="#32CD32" />
            <rect x="-8" y="-20" width="16" height="35" fill="#8B4513" />
          </g>
        );
      case "bush":
        return (
          <g key={tree.id} transform={`translate(${tree.x}, ${baseY}) scale(${tree.scale})`}>
            <ellipse cx="0" cy="-15" rx="30" ry="20" fill="#228B22" />
            <ellipse cx="-15" cy="-10" rx="20" ry="15" fill="#2E8B2E" />
            <ellipse cx="15" cy="-10" rx="20" ry="15" fill="#32CD32" />
          </g>
        );
    }
  };

  return (
    <div
      ref={gameRef}
      className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-400 to-emerald-400 overflow-hidden outline-none"
      tabIndex={0}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:scale-110 transition-transform text-2xl">
              ←
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span className="text-yellow-300">🐲</span>
              Bagon Headbutt!
              <span className="text-yellow-300">💥</span>
            </h1>
          </div>
          <div className="flex gap-6 text-lg">
            <span className="bg-white/20 px-3 py-1 rounded-full">
              🏆 Best: <b>{highScore}</b>
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              ⭐ Score: <b>{score}</b>
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              🔥 Combo: <b>{combo}x</b>
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              📈 Level: <b>{level}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex justify-center items-center py-6">
        <div
          className="relative rounded-3xl shadow-2xl overflow-hidden border-8 border-amber-800"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
          {/* Sky gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500" />

          {/* Sun */}
          <div className="absolute top-8 right-12 w-20 h-20 rounded-full bg-yellow-300 shadow-lg"
               style={{ boxShadow: "0 0 60px 20px rgba(255, 200, 0, 0.4)" }} />

          {/* Clouds (SVG) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {clouds.map(cloud => (
              <g key={cloud.id} transform={`translate(${cloud.x}, ${cloud.y}) scale(${cloud.scale})`} opacity={cloud.opacity}>
                <ellipse cx="0" cy="0" rx="40" ry="25" fill="white" />
                <ellipse cx="-30" cy="5" rx="30" ry="20" fill="white" />
                <ellipse cx="30" cy="5" rx="30" ry="20" fill="white" />
                <ellipse cx="0" cy="-15" rx="25" ry="18" fill="white" />
              </g>
            ))}
          </svg>

          {/* Mountains (SVG) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
            {mountains.map(mountain => (
              <polygon
                key={mountain.id}
                points={`${mountain.x},${GROUND_Y} ${mountain.x + mountain.width / 2},${GROUND_Y - mountain.height} ${mountain.x + mountain.width},${GROUND_Y}`}
                fill={mountain.color}
                opacity={0.6 + mountain.zIndex * 0.15}
              />
            ))}
          </svg>

          {/* Trees (SVG) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
            {trees.map(renderTree)}
          </svg>

          {/* Ground */}
          <div
            className="absolute left-0 right-0 bg-gradient-to-b from-green-500 via-green-600 to-green-700"
            style={{ top: GROUND_Y, height: GAME_HEIGHT - GROUND_Y }}
          >
            {/* Grass texture */}
            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-green-400 to-transparent" />
            <div className="absolute inset-x-0 top-1 flex justify-around">
              {[...Array(50)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-green-400 rounded-t-full transform -translate-y-1"
                     style={{ marginLeft: Math.random() * 10 + "px", height: 8 + Math.random() * 8 }} />
              ))}
            </div>
          </div>

          {/* Dirt layer */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-gradient-to-b from-amber-700 to-amber-900"
            style={{ height: 30 }}
          />

          {/* Targets - Pokemon running right, facing left */}
          {targets.map(target => (
            <div
              key={target.id}
              className="absolute"
              style={{
                left: target.x,
                top: target.y,
                width: target.size,
                height: target.size,
                transform: "scaleX(-1)", // Face left (running right)
                zIndex: 10,
              }}
            >
              <Image
                src={target.pokemon.image}
                alt={target.pokemon.name}
                width={target.size}
                height={target.size}
                className="drop-shadow-lg"
              />
            </div>
          ))}

          {/* Bagon */}
          <div
            className={`absolute transition-none ${bagonState === "landing" ? "animate-pulse" : ""}`}
            style={{
              left: bagonX,
              top: bagonY,
              width: BAGON_SIZE,
              height: BAGON_SIZE,
              transform: `rotate(${bagonRotation}deg)`,
              transformOrigin: "center center",
              zIndex: 20,
            }}
          >
            <Image
              src={bagon.image}
              alt="Bagon"
              width={BAGON_SIZE}
              height={BAGON_SIZE}
              className={`drop-shadow-xl ${isDiving ? "brightness-125" : ""} ${isHoldingSpace ? "brightness-110" : ""}`}
              style={{
                filter: isDiving
                  ? "drop-shadow(0 0 15px rgba(255, 150, 0, 0.9))"
                  : isHoldingSpace
                    ? "drop-shadow(0 0 10px rgba(150, 200, 255, 0.8))"
                    : undefined,
              }}
            />
            {/* Rising effect - wind lines */}
            {isHoldingSpace && !isDiving && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <div className="absolute top-full left-1/4 w-1 h-8 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
                <div className="absolute top-full left-1/2 w-1 h-12 bg-gradient-to-b from-white/80 to-transparent animate-pulse" style={{ animationDelay: "0.1s" }} />
                <div className="absolute top-full left-3/4 w-1 h-8 bg-gradient-to-b from-white/60 to-transparent animate-pulse" style={{ animationDelay: "0.2s" }} />
              </div>
            )}
            {/* Dive trail effect */}
            {isDiving && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <div className="absolute -left-6 top-1/4 text-2xl">💥</div>
                <div className="absolute -left-4 -top-2 w-8 h-2 bg-gradient-to-r from-yellow-400/80 to-transparent rounded-full" style={{ transform: "rotate(-45deg)" }} />
                <div className="absolute -left-6 top-1/2 w-12 h-2 bg-gradient-to-r from-orange-400/60 to-transparent rounded-full" style={{ transform: "rotate(-45deg)" }} />
              </div>
            )}
          </div>

          {/* Particles */}
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute pointer-events-none"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.type === "star" ? 16 : 8,
                height: particle.type === "star" ? 16 : 8,
                backgroundColor: particle.color,
                borderRadius: particle.type === "dust" ? "50%" : "2px",
                opacity: particle.life / 30,
                transform: particle.type === "star" ? `rotate(${particle.life * 10}deg)` : undefined,
                zIndex: 30,
              }}
            />
          ))}

          {/* Pokemon Name Announcement */}
          {currentPokemonName && gameState === "playing" && (
            <div className="absolute top-4 right-4 z-40 animate-pulse">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-2xl shadow-lg">
                <div className="text-sm opacity-80">Wild Pokemon!</div>
                <div className="text-2xl font-bold">{currentPokemonName}</div>
              </div>
            </div>
          )}

          {/* Commentary */}
          {commentary && gameState === "playing" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
              <div className={`bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg text-xl font-bold
                ${showCombo ? "animate-bounce text-orange-600 scale-125" : "text-gray-800"}`}>
                {commentary}
              </div>
            </div>
          )}

          {/* Combo display */}
          {combo > 1 && gameState === "playing" && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
              <div className="text-4xl font-black text-orange-500 drop-shadow-lg animate-pulse">
                {combo}x COMBO!
              </div>
            </div>
          )}

          {/* Menu overlay */}
          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-lg">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image src={bagon.image} alt="Bagon" fill className="object-contain" />
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Bagon Headbutt!</h2>
                <p className="text-gray-600 mb-4">
                  Help Bagon practice its famous Skull Bash move!
                </p>
                <div className="bg-purple-100 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-bold text-purple-800 mb-2">How to Play:</h3>
                  <ul className="text-purple-700 space-y-1">
                    <li>⬆️ <b>HOLD</b> <kbd className="bg-purple-200 px-2 py-0.5 rounded">SPACE</kbd> to fly up higher and higher!</li>
                    <li>💥 <b>RELEASE</b> to dive diagonally and HEADBUTT!</li>
                    <li>🎯 Headbutt the wild Pokemon running by!</li>
                    <li>🔥 Build combos for bonus points!</li>
                    <li>🎮 Play forever - no game over!</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Bagon dreams of flying and jumps off cliffs to practice.
                  Its head is harder than steel!
                </p>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => { e.stopPropagation(); startGame(); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => { e.stopPropagation(); startGame(); }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-4 px-10 rounded-full text-2xl hover:scale-105 transition-transform shadow-lg"
                >
                  START! 🚀
                </button>
                <p className="text-gray-400 mt-3 text-sm">Press SPACE or tap to start</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Controls hint */}
      {gameState === "playing" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-6 bg-white/80 backdrop-blur px-8 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <kbd className={`px-4 py-2 rounded-lg font-bold transition-all ${isHoldingSpace ? "bg-purple-600 text-white scale-110" : "bg-purple-400 text-white"}`}>
                HOLD SPACE
              </kbd>
              <span className="text-gray-600">= Rise ⬆️</span>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex items-center gap-2">
              <kbd className={`px-4 py-2 rounded-lg font-bold transition-all ${isDiving ? "bg-orange-600 text-white scale-110" : "bg-orange-400 text-white"}`}>
                RELEASE
              </kbd>
              <span className="text-gray-600">= Dive & Headbutt! 💥</span>
            </div>
          </div>
        </div>
      )}

      {/* Fun facts */}
      <div className="text-center mt-6 text-white/80 text-sm max-w-2xl mx-auto px-4">
        <p>
          <span className="font-bold">Fun Fact:</span> {bagon.flavor_text || "Bagon harbors a never-ending dream of one day soaring in the sky. It jumps off cliffs every day to get its wish."}
        </p>
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
