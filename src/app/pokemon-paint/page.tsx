"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { pokemon, Pokemon, allTypes } from "@/data/pokemon";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { usePlayer } from "@/lib/player";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type Tool =
  | "pencil"
  | "crayon"
  | "marker"
  | "spray"
  | "watercolor"
  | "glitter"
  | "rainbow"
  | "eraser"
  | "stamp"
  | "fill";

type GameMode = "free" | "color" | "challenge" | "gallery";

interface SavedPainting {
  id: string;
  dataUrl: string;
  timestamp: number;
  buddyName: string | null;
  mode: string;
}

interface Challenge {
  prompt: string;
  hints: string[];
  difficulty: "easy" | "medium" | "hard";
  targetPokemon: string | null;
}

interface BuddyReactionData {
  type: "bounce" | "wiggle" | "spin" | "hearts" | "stars";
  emoji: string;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;
const MAX_UNDO = 30;
const MAX_GALLERY = 20;
const GALLERY_STORAGE_KEY = "pokemon-paint-gallery";

// Tool metadata
const TOOLS: { id: Tool; label: string; icon: string; description: string }[] = [
  { id: "pencil", label: "Pencil", icon: "✏️", description: "Thin precise lines" },
  { id: "crayon", label: "Crayon", icon: "🖍️", description: "Textured coloring" },
  { id: "marker", label: "Marker", icon: "🖊️", description: "Bold strokes" },
  { id: "spray", label: "Spray", icon: "💨", description: "Spray paint" },
  { id: "watercolor", label: "Watercolor", icon: "💧", description: "Soft & blendable" },
  { id: "glitter", label: "Glitter", icon: "✨", description: "Sparkly magic" },
  { id: "rainbow", label: "Rainbow", icon: "🌈", description: "Color cycling" },
  { id: "eraser", label: "Eraser", icon: "🧹", description: "Erase strokes" },
  { id: "fill", label: "Fill", icon: "🪣", description: "Fill areas" },
  { id: "stamp", label: "Stamp", icon: "🎭", description: "Pokemon stamps" },
];

// Basic color palette
const BASIC_COLORS = [
  "#000000", "#FFFFFF", "#808080", "#C0C0C0",
  "#FF0000", "#FF6B35", "#FFD700", "#FFAA00",
  "#32CD32", "#228B22", "#1E90FF", "#000080",
  "#9B59B6", "#FF69B4", "#8B4513", "#F5DEB3",
  "#FF4500", "#00CED1",
];

// Type-themed palettes
const TYPE_PALETTES: Record<string, { name: string; colors: string[] }> = {
  fire: { name: "Fire", colors: ["#FF6B35", "#FF4500", "#FFD700", "#FF8C00", "#8B0000", "#FFAA00"] },
  water: { name: "Water", colors: ["#1E90FF", "#00BFFF", "#4169E1", "#87CEEB", "#000080", "#40E0D0"] },
  grass: { name: "Grass", colors: ["#32CD32", "#228B22", "#90EE90", "#006400", "#9ACD32", "#2E8B57"] },
  electric: { name: "Electric", colors: ["#FFD700", "#FFA500", "#FFFF00", "#F0E68C", "#DAA520", "#FFE4B5"] },
  psychic: { name: "Psychic", colors: ["#FF69B4", "#DA70D6", "#9B59B6", "#FF1493", "#C71585", "#DDA0DD"] },
  fairy: { name: "Fairy", colors: ["#FFB6C1", "#FF69B4", "#FFC0CB", "#DB7093", "#FFE4E1", "#FF8FAB"] },
  ghost: { name: "Ghost", colors: ["#705898", "#483D8B", "#4B0082", "#8A2BE2", "#9370DB", "#2F1B41"] },
  dragon: { name: "Dragon", colors: ["#7038F8", "#6A5ACD", "#4B0082", "#1E90FF", "#FF4500", "#9400D3"] },
  ice: { name: "Ice", colors: ["#98D8D8", "#ADD8E6", "#B0E0E6", "#E0FFFF", "#AFEEEE", "#F0F8FF"] },
  fighting: { name: "Fighting", colors: ["#C03028", "#8B0000", "#DC143C", "#FF6347", "#B22222", "#CD5C5C"] },
  poison: { name: "Poison", colors: ["#A040A0", "#800080", "#9932CC", "#BA55D3", "#8B008B", "#6A0DAD"] },
  ground: { name: "Ground", colors: ["#E0C068", "#D2B48C", "#DEB887", "#8B7355", "#A0522D", "#F4A460"] },
  flying: { name: "Flying", colors: ["#A890F0", "#87CEEB", "#B0C4DE", "#6495ED", "#7B68EE", "#ADD8E6"] },
  bug: { name: "Bug", colors: ["#A8B820", "#6B8E23", "#9ACD32", "#556B2F", "#808000", "#BDB76B"] },
  rock: { name: "Rock", colors: ["#B8A038", "#A0522D", "#8B7355", "#D2B48C", "#696969", "#CD853F"] },
  dark: { name: "Dark", colors: ["#705848", "#2F2F2F", "#4A4A4A", "#1C1C1C", "#3D3D3D", "#555555"] },
  steel: { name: "Steel", colors: ["#B8B8D0", "#708090", "#C0C0C0", "#A9A9A9", "#778899", "#D3D3D3"] },
  normal: { name: "Normal", colors: ["#A8A878", "#D2B48C", "#F5DEB3", "#C0C0C0", "#808080", "#FAEBD7"] },
};

// Starter Pokemon for buddy selection
const STARTER_POKEMON_IDS = [1, 4, 7, 25, 133, 39, 150, 152, 155, 158, 252, 255, 258, 387, 390, 393];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function colorsMatch(
  r1: number, g1: number, b1: number, a1: number,
  r2: number, g2: number, b2: number, a2: number,
  tolerance: number = 32
): boolean {
  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance &&
    Math.abs(a1 - a2) <= tolerance
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PokemonPaintPage() {
  const { name: playerName } = usePlayer();

  // -- Canvas refs --
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Drawing state --
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>("crayon");
  const [brushSize, setBrushSize] = useState(8);
  const [opacity, setOpacity] = useState(1);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<string>("basic");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const rainbowHueRef = useRef(0);


  // -- Undo/Redo --
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // -- Game mode --
  const [gameMode, setGameMode] = useState<GameMode>("free");

  // -- Art buddy --
  const [buddyPokemon, setBuddyPokemon] = useState<Pokemon | null>(null);
  const [buddyMessage, setBuddyMessage] = useState("");
  const [buddyReaction, setBuddyReaction] = useState<BuddyReactionData | null>(null);
  const [showBuddyPicker, setShowBuddyPicker] = useState(false);
  const [buddySearchQuery, setBuddySearchQuery] = useState("");

  const strokeCountRef = useRef(0);
  const [buddyLoading, setBuddyLoading] = useState(false);

  // -- Session history (tracked for AI buddy context) --
  const sessionHistoryRef = useRef<{
    stampsPlaced: string[];
    toolsUsed: Set<string>;
    colorsUsed: Set<string>;
    challengesCompleted: number;
    paintingsSaved: number;
    coloringPokemon: string | null;
    activeType: string | null;
    strokeCount: number;
  }>({
    stampsPlaced: [],
    toolsUsed: new Set(),
    colorsUsed: new Set(),
    challengesCompleted: 0,
    paintingsSaved: 0,
    coloringPokemon: null,
    activeType: null,
    strokeCount: 0,
  });

  // -- Stamps --
  const [selectedStamp, setSelectedStamp] = useState<Pokemon | null>(null);
  const [stampSize, setStampSize] = useState(80);
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [stampSearch, setStampSearch] = useState("");
  const [stampCursorPos, setStampCursorPos] = useState<{ x: number; y: number } | null>(null);

  // -- Type effects --
  const [activeType, setActiveType] = useState<string | null>(null);
  const typeParticlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    color: string; type: string;
  }>>([]);
  const particleAnimRef = useRef<number | null>(null);

  // -- Coloring mode --
  const [coloringPokemon, setColoringPokemon] = useState<Pokemon | null>(null);
  const [showColoringPicker, setShowColoringPicker] = useState(false);
  const [coloringSearch, setColoringSearch] = useState("");

  // -- Challenge mode --
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeStars, setChallengeStars] = useState(0);
  const [challengeLoading, setChallengeLoading] = useState(false);

  // -- Gallery --
  const [gallery, setGallery] = useState<SavedPainting[]>([]);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<SavedPainting | null>(null);

  // -- UI --
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showTypeEffects, setShowTypeEffects] = useState(false);
  const hasSpokenWelcomeRef = useRef(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Load gallery from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (saved) setGallery(JSON.parse(saved));
    } catch {}
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    saveUndoState();
  }, []);

  // Welcome speech
  useEffect(() => {
    if (hasSpokenWelcomeRef.current) return;
    hasSpokenWelcomeRef.current = true;
    const timer = setTimeout(() => {
      const name = playerName || "artist";
      speak(`Welcome to Pokemon Painting Studio, ${name}! Pick a brush and start creating!`, {
        rate: 0.9,
        pitch: 1.1,
      });
      playSound("powerup", { volume: 0.4 });
    }, 500);
    return () => clearTimeout(timer);
  }, [playerName]);

  // ============================================================================
  // UNDO / REDO
  // ============================================================================

  const saveUndoState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    undoStackRef.current.push(imageData);
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(true);
    playSound("whoosh", { volume: 0.3, rate: 1.5 });
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(next);
    ctx.putImageData(next, 0, 0);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    playSound("whoosh", { volume: 0.3, rate: 0.8 });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    saveUndoState();
    playSound("release", { volume: 0.4 });
    speak("Fresh canvas! Time to create something new!", { rate: 1.0, pitch: 1.1 });
  }, [saveUndoState]);

  // ============================================================================
  // COORDINATE MAPPING
  // ============================================================================

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // ============================================================================
  // BRUSH RENDERING
  // ============================================================================

  const drawStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number },
      to: { x: number; y: number },
      tool: Tool,
      color: string,
      size: number,
      alpha: number
    ) => {
      const [r, g, b] = hexToRgb(color);

      ctx.save();

      switch (tool) {
        case "pencil": {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, size * 0.3);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          break;
        }

        case "crayon": {
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          const dist = Math.hypot(to.x - from.x, to.y - from.y);
          const steps = Math.max(1, Math.floor(dist / 2));
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            // Jitter for crayon texture
            for (let j = 0; j < 3; j++) {
              const jx = x + (Math.random() - 0.5) * size * 0.5;
              const jy = y + (Math.random() - 0.5) * size * 0.5;
              ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.4);
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(jx, jy, size * 0.2 + Math.random() * size * 0.15, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "marker": {
          ctx.globalAlpha = alpha * 0.3;
          ctx.strokeStyle = color;
          ctx.lineWidth = size * 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          break;
        }

        case "spray": {
          ctx.globalAlpha = alpha;
          const sprayRadius = size * 2;
          const density = Math.floor(size * 3);
          for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * sprayRadius;
            const sx = to.x + Math.cos(angle) * radius;
            const sy = to.y + Math.sin(angle) * radius;
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha * (0.3 + Math.random() * 0.5);
            ctx.fillRect(sx, sy, 1 + Math.random(), 1 + Math.random());
          }
          break;
        }

        case "watercolor": {
          ctx.globalAlpha = alpha * 0.08;
          ctx.fillStyle = color;
          const wcSize = size * 3;
          const dist2 = Math.hypot(to.x - from.x, to.y - from.y);
          const steps2 = Math.max(1, Math.floor(dist2 / 4));
          for (let i = 0; i <= steps2; i++) {
            const t = i / steps2;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            for (let layer = 0; layer < 5; layer++) {
              const ox = (Math.random() - 0.5) * wcSize * 0.3;
              const oy = (Math.random() - 0.5) * wcSize * 0.3;
              ctx.beginPath();
              ctx.arc(x + ox, y + oy, wcSize * 0.5 + Math.random() * wcSize * 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "glitter": {
          const dist3 = Math.hypot(to.x - from.x, to.y - from.y);
          const steps3 = Math.max(1, Math.floor(dist3 / 3));
          for (let i = 0; i <= steps3; i++) {
            const t = i / steps3;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            for (let s = 0; s < 4; s++) {
              const sx = x + (Math.random() - 0.5) * size * 2;
              const sy = y + (Math.random() - 0.5) * size * 2;
              const sparkSize = 1 + Math.random() * size * 0.4;
              const hueShift = Math.random() * 60 - 30;
              const baseHue = (parseInt(color.slice(1, 3), 16) * 1.4) % 360;
              const sparkColor = `hsl(${baseHue + hueShift}, 80%, ${50 + Math.random() * 40}%)`;
              ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
              ctx.fillStyle = Math.random() > 0.8 ? "#FFFFFF" : sparkColor;
              ctx.beginPath();
              ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case "rainbow": {
          const hue = rainbowHueRef.current;
          rainbowHueRef.current = (hue + 3) % 360;
          const [rr, rg, rb] = hslToRgb(hue, 80, 60);
          const rainColor = rgbToHex(rr, rg, rb);
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = rainColor;
          ctx.lineWidth = size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          break;
        }

        case "eraser": {
          ctx.globalCompositeOperation = "destination-out";
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.lineWidth = size * 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          break;
        }

        default:
          break;
      }

      ctx.restore();
    },
    []
  );

  // Flood fill
  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const data = imageData.data;
      const [fr, fg, fb] = hexToRgb(fillColor);
      const fa = Math.round(opacity * 255);

      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      const startIdx = (sy * CANVAS_WIDTH + sx) * 4;
      const sr = data[startIdx];
      const sg = data[startIdx + 1];
      const sb = data[startIdx + 2];
      const sa = data[startIdx + 3];

      if (sr === fr && sg === fg && sb === fb && sa === fa) return;

      const stack: [number, number][] = [[sx, sy]];
      const visited = new Set<number>();

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = y * CANVAS_WIDTH + x;
        if (visited.has(key)) continue;
        if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;

        const idx = key * 4;
        if (!colorsMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], sr, sg, sb, sa)) continue;

        visited.add(key);
        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = fa;

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      ctx.putImageData(imageData, 0, 0);
      saveUndoState();
    },
    [opacity, saveUndoState]
  );

  // ============================================================================
  // TYPE EFFECT PARTICLES
  // ============================================================================

  const spawnTypeParticles = useCallback(
    (x: number, y: number, type: string) => {
      const palette = TYPE_PALETTES[type];
      if (!palette) return;

      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const color = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        let vx = (Math.random() - 0.5) * 3;
        let vy = (Math.random() - 0.5) * 3;
        const life = 30 + Math.random() * 30;

        // Type-specific behavior
        if (type === "fire") {
          vy = -(1 + Math.random() * 3);
          vx = (Math.random() - 0.5) * 2;
        } else if (type === "water") {
          vy = 1 + Math.random() * 2;
          vx = (Math.random() - 0.5) * 0.5;
        } else if (type === "electric") {
          vx = (Math.random() - 0.5) * 6;
          vy = (Math.random() - 0.5) * 6;
        } else if (type === "ice") {
          vy = 0.5 + Math.random();
          vx = (Math.random() - 0.5) * 1.5;
        } else if (type === "psychic") {
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * 2;
          vy = Math.sin(angle) * 2;
        } else if (type === "fairy") {
          vy = -(0.5 + Math.random());
          vx = (Math.random() - 0.5) * 2;
        } else if (type === "ghost") {
          vy = -(0.3 + Math.random() * 0.8);
          vx = Math.sin(Date.now() * 0.01 + i) * 1.5;
        }

        typeParticlesRef.current.push({
          x, y, vx, vy,
          life, maxLife: life,
          size: 2 + Math.random() * 4,
          color, type,
        });
      }
    },
    []
  );

  const renderTypeParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = typeParticlesRef.current;
    const alive: typeof particles = [];

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.life <= 0) continue;
      alive.push(p);

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * opacity;
      ctx.fillStyle = p.color;

      if (p.type === "electric") {
        // Lightning bolt fragments
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8);
        ctx.stroke();
      } else if (p.type === "fairy" || p.type === "ice") {
        // Star/snowflake shape
        const spikes = p.type === "fairy" ? 4 : 6;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? p.size : p.size * 0.4;
          const angle = (i * Math.PI) / spikes;
          const sx = p.x + Math.cos(angle) * radius;
          const sy = p.y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Circle particles
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.type === "ghost" ? alpha : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    typeParticlesRef.current = alive;

    if (alive.length > 0) {
      particleAnimRef.current = requestAnimationFrame(renderTypeParticles);
    } else {
      particleAnimRef.current = null;
    }
  }, [opacity]);

  // Start particle animation loop when particles exist
  useEffect(() => {
    return () => {
      if (particleAnimRef.current) {
        cancelAnimationFrame(particleAnimRef.current);
      }
    };
  }, []);

  // ============================================================================
  // ART BUDDY SYSTEM
  // ============================================================================

  const triggerBuddyCommentary = useCallback(
    async (event: string) => {
      if (!buddyPokemon) return;
      if (buddyLoading) return;
      setBuddyLoading(true);

      // Get dominant colors from canvas
      const canvas = canvasRef.current;
      let dominantColors: string[] = [];
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const colorCounts: Record<string, number> = {};
          for (let i = 0; i < imageData.data.length; i += 16) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            if (r > 240 && g > 240 && b > 240) continue;
            const hex = rgbToHex(
              Math.round(r / 32) * 32,
              Math.round(g / 32) * 32,
              Math.round(b / 32) * 32
            );
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
          dominantColors = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([c]) => c);
        }
      }

      // Build rich session context
      const history = sessionHistoryRef.current;
      const sessionContext = {
        stampsPlaced: history.stampsPlaced.slice(-10),
        toolsUsed: Array.from(history.toolsUsed),
        uniqueColorsUsed: history.colorsUsed.size,
        challengesCompleted: history.challengesCompleted,
        paintingsSaved: history.paintingsSaved,
        coloringPokemon: history.coloringPokemon,
        activeTypeEffect: history.activeType,
        totalStrokes: history.strokeCount,
      };

      try {
        const res = await fetch("/api/ai/paint-buddy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buddyName: buddyPokemon.name,
            buddyTypes: buddyPokemon.types,
            playerName: playerName || "artist",
            dominantColors,
            currentTool,
            event,
            sessionContext,
          }),
        });

        const data = await res.json();
        setBuddyMessage(data.message);
        setBuddyReaction({ type: data.reaction, emoji: data.emoji });

        playSound("ding", { volume: 0.2 });
        setTimeout(() => {
          const pitch = buddyPokemon.height > 20 ? 0.7 : buddyPokemon.height > 10 ? 1.0 : 1.3;
          speak(data.message, { rate: 0.95, pitch });
        }, 300);

        setTimeout(() => setBuddyReaction(null), 3000);
      } catch {
        setBuddyMessage(`${buddyPokemon.name} is thinking...`);
        setTimeout(() => setBuddyReaction(null), 3000);
      } finally {
        setBuddyLoading(false);
      }
    },
    [buddyPokemon, buddyLoading, currentTool, playerName]
  );

  const selectBuddy = useCallback(
    (p: Pokemon) => {
      setBuddyPokemon(p);
      setShowBuddyPicker(false);
      setBuddySearchQuery("");
      playSound("catch", { volume: 0.5 });
      setTimeout(() => {
        triggerBuddyCommentary("greeting");
      }, 500);
    },
    [triggerBuddyCommentary]
  );

  // ============================================================================
  // STAMP PLACEMENT
  // ============================================================================

  const placeStamp = useCallback(
    (x: number, y: number) => {
      if (!selectedStamp) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const halfSize = stampSize / 2;
        ctx.drawImage(img, x - halfSize, y - halfSize, stampSize, stampSize);
        saveUndoState();
        playSound("catch", { volume: 0.4 });
        sessionHistoryRef.current.stampsPlaced.push(selectedStamp!.name);
      };
      img.src = selectedStamp.image;
    },
    [selectedStamp, stampSize, saveUndoState]
  );

  // ============================================================================
  // DRAWING EVENT HANDLERS
  // ============================================================================

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const coords = getCanvasCoords(e);

      // Stamp placement
      if (currentTool === "stamp" && selectedStamp) {
        placeStamp(coords.x, coords.y);
        return;
      }

      // Fill tool
      if (currentTool === "fill") {
        floodFill(coords.x, coords.y, currentColor);
        playSound("pop", { volume: 0.3 });
        return;
      }

      setIsDrawing(true);
      lastPointRef.current = coords;

      // Draw a single dot at the starting point
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawStroke(ctx, coords, coords, currentTool, currentColor, brushSize, opacity);
      }

      // Spawn type particles if type effect is active
      if (activeType) {
        spawnTypeParticles(coords.x, coords.y, activeType);
        if (!particleAnimRef.current) {
          particleAnimRef.current = requestAnimationFrame(renderTypeParticles);
        }
      }

      canvas.setPointerCapture(e.pointerId);
    },
    [
      currentTool, selectedStamp, currentColor, brushSize, opacity, activeType,
      getCanvasCoords, floodFill, drawStroke, spawnTypeParticles, renderTypeParticles, placeStamp,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);

      // Stamp cursor preview
      if (currentTool === "stamp" && selectedStamp) {
        setStampCursorPos(coords);
      }

      if (!isDrawing || !lastPointRef.current) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawStroke(ctx, lastPointRef.current, coords, currentTool, currentColor, brushSize, opacity);

      if (activeType) {
        spawnTypeParticles(coords.x, coords.y, activeType);
        if (!particleAnimRef.current) {
          particleAnimRef.current = requestAnimationFrame(renderTypeParticles);
        }
      }

      lastPointRef.current = coords;
    },
    [
      isDrawing, currentTool, selectedStamp, currentColor, brushSize, opacity, activeType,
      getCanvasCoords, drawStroke, spawnTypeParticles, renderTypeParticles,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      lastPointRef.current = null;
      saveUndoState();
      strokeCountRef.current++;
      sessionHistoryRef.current.strokeCount = strokeCountRef.current;
      sessionHistoryRef.current.toolsUsed.add(currentTool);
      sessionHistoryRef.current.colorsUsed.add(currentColor);
    },
    [isDrawing, saveUndoState, currentTool, currentColor]
  );

  // ============================================================================
  // COLORING MODE
  // ============================================================================

  const loadColoringPage = useCallback(
    (p: Pokemon) => {
      setColoringPokemon(p);
      setShowColoringPicker(false);
      setColoringSearch("");
      setGameMode("color");
      sessionHistoryRef.current.coloringPokemon = p.name;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear to white
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Load and draw the Pokemon as a light outline
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Draw centered, large
        const maxDim = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.7;
        const scale = maxDim / Math.max(img.width, img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (CANVAS_WIDTH - w) / 2;
        const y = (CANVAS_HEIGHT - h) / 2;

        // Draw a light gray version as guide
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();

        // Draw outline: use the image as a mask with edge detection
        // Create offscreen canvas for processing
        const offscreen = document.createElement("canvas");
        offscreen.width = CANVAS_WIDTH;
        offscreen.height = CANVAS_HEIGHT;
        const offCtx = offscreen.getContext("2d")!;
        offCtx.drawImage(img, x, y, w, h);
        const imgData = offCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = imgData.data;

        // Simple edge detection: detect alpha transitions
        const outlineData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
        const od = outlineData.data;

        for (let py = 1; py < CANVAS_HEIGHT - 1; py++) {
          for (let px = 1; px < CANVAS_WIDTH - 1; px++) {
            const idx = (py * CANVAS_WIDTH + px) * 4;
            const a = data[idx + 3];

            // Check neighbors for alpha difference
            const above = data[((py - 1) * CANVAS_WIDTH + px) * 4 + 3];
            const below = data[((py + 1) * CANVAS_WIDTH + px) * 4 + 3];
            const left = data[(py * CANVAS_WIDTH + (px - 1)) * 4 + 3];
            const right = data[(py * CANVAS_WIDTH + (px + 1)) * 4 + 3];

            const edgeStrength =
              Math.abs(a - above) + Math.abs(a - below) +
              Math.abs(a - left) + Math.abs(a - right);

            if (edgeStrength > 100) {
              od[idx] = 50;
              od[idx + 1] = 50;
              od[idx + 2] = 50;
              od[idx + 3] = Math.min(255, edgeStrength);
            }
          }
        }

        ctx.putImageData(outlineData, 0, 0, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Composite: draw outline on top of the light fill
        ctx.drawImage(offscreen, 0, 0, 0, 0); // no-op, just needed the processing
        // Redraw white bg then outline
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = CANVAS_WIDTH;
        finalCanvas.height = CANVAS_HEIGHT;
        const fCtx = finalCanvas.getContext("2d")!;
        fCtx.fillStyle = "#FFFFFF";
        fCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Light guide
        fCtx.globalAlpha = 0.12;
        fCtx.drawImage(img, x, y, w, h);
        fCtx.globalAlpha = 1;
        // Outline on top
        fCtx.putImageData(outlineData, 0, 0);
        // But putImageData replaces, so we need compositing
        // Simpler approach: draw outline on white + guide
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 0.12;
        ctx.drawImage(img, x, y, w, h);
        ctx.globalAlpha = 1;

        // Draw outlines
        for (let py = 1; py < CANVAS_HEIGHT - 1; py++) {
          for (let px = 1; px < CANVAS_WIDTH - 1; px++) {
            const idx = (py * CANVAS_WIDTH + px) * 4;
            if (od[idx + 3] > 50) {
              ctx.fillStyle = `rgba(50,50,50,${od[idx + 3] / 255})`;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }

        saveUndoState();

        playSound("pop", { volume: 0.4 });
        speak(`Time to color ${p.name}! Use any colors you like!`, { rate: 0.9, pitch: 1.1 });
      };
      img.src = p.image;
    },
    [saveUndoState]
  );

  // ============================================================================
  // CHALLENGE MODE
  // ============================================================================

  const generateChallenge = useCallback(async () => {
    setChallengeLoading(true);
    setGameMode("challenge");

    try {
      const randomPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
      const res = await fetch("/api/ai/paint-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buddyName: randomPokemon.name,
          buddyTypes: randomPokemon.types,
          playerName: playerName || "artist",
          dominantColors: [],
          currentTool: "crayon",
          event: "challenge_prompt",
        }),
      });

      // Use a simpler challenge generation since we're reusing the endpoint
      const challenges: Challenge[] = [
        {
          prompt: `Draw ${randomPokemon.name} from memory!`,
          hints: [`It's a ${randomPokemon.types.join("/")} type`, `It's ${randomPokemon.color} colored`],
          difficulty: "medium",
          targetPokemon: randomPokemon.name,
        },
        {
          prompt: "Create your very own new Pokemon!",
          hints: ["What type would it be?", "Give it a cool shape!", "Add special features!"],
          difficulty: "easy",
          targetPokemon: null,
        },
        {
          prompt: `Paint ${randomPokemon.name}'s home! Where does it live?`,
          hints: [
            `It's a ${randomPokemon.types.join("/")} type`,
            randomPokemon.habitat ? `It lives in ${randomPokemon.habitat}` : "Use your imagination!",
          ],
          difficulty: "easy",
          targetPokemon: randomPokemon.name,
        },
        {
          prompt: `Draw a battle between two Pokemon!`,
          hints: ["Pick two different types!", "Add action lines!", "Show their special moves!"],
          difficulty: "hard",
          targetPokemon: null,
        },
        {
          prompt: `Paint a ${randomPokemon.types[0]}-type landscape!`,
          hints: [
            `Think about ${randomPokemon.types[0]}-type environments`,
            "Add Pokemon living there!",
            "Use type-themed colors!",
          ],
          difficulty: "medium",
          targetPokemon: null,
        },
      ];

      const challenge = challenges[Math.floor(Math.random() * challenges.length)];
      setCurrentChallenge(challenge);

      // Clear canvas for challenge
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          saveUndoState();
        }
      }

      playSound("countdown", { volume: 0.3 });
      setTimeout(() => {
        speak(challenge.prompt, { rate: 0.85, pitch: 1.0 });
      }, 500);
    } catch {
      setCurrentChallenge({
        prompt: "Draw your favorite Pokemon!",
        hints: ["Pick any Pokemon you love!", "Use lots of colors!"],
        difficulty: "easy",
        targetPokemon: null,
      });
    } finally {
      setChallengeLoading(false);
    }
  }, [playerName, saveUndoState]);

  const completeChallenge = useCallback(() => {
    setChallengeStars((prev) => prev + 1);
    sessionHistoryRef.current.challengesCompleted++;
    playSound("powerup", { volume: 0.5 });
    setTimeout(() => playSound("win", { volume: 0.4 }), 300);
    speak(
      `Fantastic work${playerName ? ", " + playerName : ""}! You earned a star! You're a true Pokemon artist!`,
      { rate: 1.0, pitch: 1.3 }
    );
    setCurrentChallenge(null);
  }, [playerName]);

  // ============================================================================
  // GALLERY
  // ============================================================================

  const savePainting = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (gallery.length >= MAX_GALLERY) {
      speak("Your gallery is full! Delete a painting to make room.", { rate: 1.0 });
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const painting: SavedPainting = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: Date.now(),
      buddyName: buddyPokemon?.name || null,
      mode: gameMode,
    };

    const newGallery = [painting, ...gallery];
    setGallery(newGallery);
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(newGallery));
    } catch {}

    playSound("success", { volume: 0.4 });
    setTimeout(() => playSound("coin", { volume: 0.3 }), 200);
    speak("Masterpiece saved! You're a brilliant artist!", { rate: 1.0, pitch: 1.1 });
    sessionHistoryRef.current.paintingsSaved++;
  }, [gallery, buddyPokemon, gameMode]);

  const deletePainting = useCallback(
    (id: string) => {
      const newGallery = gallery.filter((p) => p.id !== id);
      setGallery(newGallery);
      try {
        localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(newGallery));
      } catch {}
      setSelectedGalleryItem(null);
      playSound("release", { volume: 0.3 });
    },
    [gallery]
  );

  // ============================================================================
  // COLOR HANDLING
  // ============================================================================

  const selectColor = useCallback(
    (color: string) => {
      setCurrentColor(color);
      // Track recent colors
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        return [color, ...filtered].slice(0, 8);
      });
      playSound("select", { volume: 0.2 });
    },
    []
  );

  const selectTool = useCallback(
    (tool: Tool) => {
      setCurrentTool(tool);
      if (tool === "stamp") {
        setShowStampPicker(true);
      } else {
        setShowStampPicker(false);
        setSelectedStamp(null);
        setStampCursorPos(null);
      }
      if (tool !== "stamp") {
        playSound("click", { volume: 0.3 });
      }
    },
    []
  );

  const selectTypeEffect = useCallback(
    (type: string | null) => {
      setActiveType(type);
      setShowTypeEffects(false);
      sessionHistoryRef.current.activeType = type;
      if (type) {
        playSound("powerup", { volume: 0.4, rate: type === "electric" ? 1.5 : type === "fire" ? 0.8 : 1.0 });
        speak(`Feel the power of ${type}!`, {
          rate: 1.2,
          pitch: type === "fairy" ? 1.4 : type === "dragon" ? 0.7 : 1.0,
        });
        // Auto-select the type's first color
        const palette = TYPE_PALETTES[type];
        if (palette) {
          setSelectedPalette(type);
          selectColor(palette.colors[0]);
        }
      }
    },
    [selectColor]
  );

  // ============================================================================
  // BUDDY SEARCH / STAMP SEARCH
  // ============================================================================

  const filteredStampPokemon = useMemo(() => {
    if (!stampSearch) return pokemon.slice(0, 50);
    const q = stampSearch.toLowerCase();
    return pokemon
      .filter((p) => p.name.toLowerCase().includes(q) || p.types.some((t) => t.includes(q)))
      .slice(0, 50);
  }, [stampSearch]);

  const filteredBuddyPokemon = useMemo(() => {
    if (!buddySearchQuery) {
      return pokemon.filter((p) => STARTER_POKEMON_IDS.includes(p.id));
    }
    const q = buddySearchQuery.toLowerCase();
    return pokemon
      .filter((p) => p.name.toLowerCase().includes(q) || p.types.some((t) => t.includes(q)))
      .slice(0, 30);
  }, [buddySearchQuery]);

  const filteredColoringPokemon = useMemo(() => {
    if (!coloringSearch) return pokemon.slice(0, 50);
    const q = coloringSearch.toLowerCase();
    return pokemon
      .filter((p) => p.name.toLowerCase().includes(q) || p.types.some((t) => t.includes(q)))
      .slice(0, 50);
  }, [coloringSearch]);

  // Current palette colors
  const currentPaletteColors = useMemo(() => {
    if (selectedPalette === "basic") return BASIC_COLORS;
    return TYPE_PALETTES[selectedPalette]?.colors || BASIC_COLORS;
  }, [selectedPalette]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen pb-4">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl p-3 mb-3 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Mode tabs */}
          <div className="flex gap-1">
            {(
              [
                { id: "free", label: "Free Paint", icon: "🎨" },
                { id: "color", label: "Coloring", icon: "🖍️" },
                { id: "challenge", label: "Challenge", icon: "⭐" },
                { id: "gallery", label: "Gallery", icon: "🖼️" },
              ] as { id: GameMode; label: string; icon: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  if (mode.id === "gallery") {
                    setGameMode("gallery");
                  } else if (mode.id === "color") {
                    setShowColoringPicker(true);
                  } else if (mode.id === "challenge") {
                    generateChallenge();
                  } else {
                    setGameMode("free");
                    setCurrentChallenge(null);
                    setColoringPokemon(null);
                  }
                  playSound("click", { volume: 0.2 });
                }}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  gameMode === mode.id
                    ? "bg-white text-purple-600 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 transition-all"
              title="Undo"
            >
              ↩️
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 transition-all"
              title="Redo"
            >
              ↪️
            </button>
            <button
              onClick={clearCanvas}
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
              title="Clear"
            >
              🗑️
            </button>
            <button
              onClick={savePainting}
              className="px-3 py-1.5 rounded-xl bg-yellow-400 text-yellow-900 font-bold text-sm hover:bg-yellow-300 transition-all shadow"
              title="Save"
            >
              💾 Save
            </button>
            {challengeStars > 0 && (
              <span className="px-2 py-1 bg-yellow-400/30 rounded-lg text-white font-bold text-sm">
                ⭐ {challengeStars}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gallery view */}
      {gameMode === "gallery" ? (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-4">
            🖼️ Your Gallery ({gallery.length}/{MAX_GALLERY})
          </h2>
          {gallery.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-6xl mb-4">🎨</p>
              <p className="text-lg">No paintings yet! Start painting to fill your gallery!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gallery.map((painting) => (
                <div
                  key={painting.id}
                  className="relative group cursor-pointer rounded-xl overflow-hidden border-4 border-yellow-400 shadow-lg hover:scale-105 transition-transform"
                  onClick={() => setSelectedGalleryItem(painting)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={painting.dataUrl}
                    alt="Saved painting"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs">
                      {new Date(painting.timestamp).toLocaleDateString()}
                    </p>
                    {painting.buddyName && (
                      <p className="text-yellow-300 text-xs">with {painting.buddyName}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePainting(painting.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Full-size view modal */}
          {selectedGalleryItem && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedGalleryItem(null)}
            >
              <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="border-8 border-yellow-500 rounded-2xl overflow-hidden shadow-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedGalleryItem.dataUrl}
                    alt="Painting"
                    className="w-full"
                  />
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => setSelectedGalleryItem(null)}
                    className="px-4 py-2 bg-white rounded-xl font-bold shadow hover:scale-105 transition-transform"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => deletePainting(selectedGalleryItem.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold shadow hover:scale-105 transition-transform"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main painting interface */
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Left: Tools */}
          <div className="lg:w-20 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {/* Mobile toggle */}
            <button
              className="lg:hidden p-2 bg-purple-500 text-white rounded-xl font-bold text-sm shrink-0"
              onClick={() => setShowMobileTools(!showMobileTools)}
            >
              🔧
            </button>

            <div className={`flex lg:flex-col gap-1 ${showMobileTools ? "" : "hidden lg:flex"}`}>
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => selectTool(tool.id)}
                  className={`p-2 rounded-xl text-center transition-all shrink-0 ${
                    currentTool === tool.id
                      ? "bg-purple-500 text-white shadow-lg scale-110"
                      : "bg-white shadow hover:bg-purple-50"
                  }`}
                  title={tool.description}
                >
                  <span className="text-lg">{tool.icon}</span>
                  <p className="text-[10px] font-bold mt-0.5 leading-tight">{tool.label}</p>
                </button>
              ))}

              {/* Type effects button */}
              <button
                onClick={() => setShowTypeEffects(!showTypeEffects)}
                className={`p-2 rounded-xl text-center transition-all shrink-0 ${
                  activeType
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg"
                    : "bg-white shadow hover:bg-yellow-50"
                }`}
                title="Type Effects"
              >
                <span className="text-lg">⚡</span>
                <p className="text-[10px] font-bold mt-0.5 leading-tight">
                  {activeType ? activeType.charAt(0).toUpperCase() + activeType.slice(1) : "Effects"}
                </p>
              </button>
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 min-w-0">
            {/* Challenge banner */}
            {currentChallenge && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-3 mb-2 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-white text-lg">{currentChallenge.prompt}</p>
                    {currentChallenge.hints.length > 0 && (
                      <p className="text-yellow-100 text-sm mt-1">
                        💡 Hint: {currentChallenge.hints[0]}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={completeChallenge}
                    className="px-4 py-2 bg-white text-orange-600 rounded-xl font-bold hover:scale-105 transition-transform shadow"
                  >
                    ✅ Done!
                  </button>
                </div>
              </div>
            )}

            {/* Coloring mode banner */}
            {coloringPokemon && gameMode === "color" && (
              <div className="bg-gradient-to-r from-pink-400 to-rose-400 rounded-xl p-3 mb-2 shadow-lg">
                <div className="flex items-center gap-3">
                  <Image
                    src={coloringPokemon.image}
                    alt={coloringPokemon.name}
                    width={40}
                    height={40}
                  />
                  <div>
                    <p className="font-bold text-white">Coloring: {coloringPokemon.name}</p>
                    <p className="text-pink-100 text-sm">Color inside the lines!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Canvas container */}
            <div
              ref={containerRef}
              className="relative bg-gray-100 rounded-2xl shadow-xl overflow-hidden border-4 border-white"
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="w-full cursor-crosshair touch-none"
                style={{
                  cursor: currentTool === "stamp" && selectedStamp ? "none" : currentTool === "eraser" ? "cell" : "crosshair",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />

              {/* Stamp cursor preview */}
              {currentTool === "stamp" && selectedStamp && stampCursorPos && (
                <div
                  className="absolute pointer-events-none opacity-60"
                  style={{
                    left: `${(stampCursorPos.x / CANVAS_WIDTH) * 100}%`,
                    top: `${(stampCursorPos.y / CANVAS_HEIGHT) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${(stampSize / CANVAS_WIDTH) * 100}%`,
                    height: `${(stampSize / CANVAS_HEIGHT) * 100}%`,
                  }}
                >
                  <Image
                    src={selectedStamp.image}
                    alt={selectedStamp.name}
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              {/* Active type effect indicator */}
              {activeType && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/40 rounded-lg text-white text-xs font-bold flex items-center gap-1">
                  <span>⚡ {activeType.toUpperCase()} effect active</span>
                  <button
                    onClick={() => selectTypeEffect(null)}
                    className="ml-1 text-red-300 hover:text-red-100"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div className="mt-2 flex flex-wrap items-center gap-4 bg-white rounded-xl p-3 shadow">
              {/* Brush size */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Size</span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-purple-500"
                />
                <span className="text-xs text-gray-400 w-6">{brushSize}</span>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Opacity</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  className="w-24 accent-purple-500"
                />
                <span className="text-xs text-gray-400 w-8">{Math.round(opacity * 100)}%</span>
              </div>

              {/* Stamp size (when stamp tool active) */}
              {currentTool === "stamp" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Stamp</span>
                  <input
                    type="range"
                    min={30}
                    max={200}
                    value={stampSize}
                    onChange={(e) => setStampSize(Number(e.target.value))}
                    className="w-24 accent-pink-500"
                  />
                  <span className="text-xs text-gray-400 w-8">{stampSize}px</span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Colors + Buddy */}
          <div className="lg:w-56 flex flex-col gap-2">
            {/* Color palette selector */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">PALETTE</span>
                <select
                  value={selectedPalette}
                  onChange={(e) => setSelectedPalette(e.target.value)}
                  className="text-xs border rounded px-1 py-0.5"
                >
                  <option value="basic">Basic</option>
                  {Object.entries(TYPE_PALETTES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color grid */}
              <div className="grid grid-cols-6 gap-1 mb-2">
                {currentPaletteColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                      currentColor === color ? "border-purple-500 scale-110 ring-2 ring-purple-300" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => selectColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <span className="text-xs text-gray-400">Custom</span>
              </div>

              {/* Recent colors */}
              {recentColors.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] text-gray-400">Recent</span>
                  <div className="flex gap-1 mt-0.5">
                    {recentColors.map((color, i) => (
                      <button
                        key={`${color}-${i}`}
                        onClick={() => selectColor(color)}
                        className="w-5 h-5 rounded border border-gray-200 hover:scale-125 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Art Buddy */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">ART BUDDY</span>
                <button
                  onClick={() => setShowBuddyPicker(true)}
                  className="text-xs text-purple-500 hover:text-purple-700 font-bold"
                >
                  {buddyPokemon ? "Change" : "Pick"}
                </button>
              </div>

              {buddyPokemon ? (
                <div className="text-center">
                  <button
                    onClick={() => triggerBuddyCommentary("clicked")}
                    disabled={buddyLoading}
                    className={`inline-block transition-transform duration-500 cursor-pointer hover:scale-110 active:scale-95 ${
                      buddyReaction?.type === "bounce"
                        ? "animate-bounce"
                        : buddyReaction?.type === "wiggle"
                        ? "animate-pulse"
                        : buddyReaction?.type === "spin"
                        ? "animate-spin"
                        : ""
                    } ${buddyLoading ? "opacity-50" : ""}`}
                    title="Click me for a comment!"
                  >
                    <Image
                      src={buddyPokemon.image}
                      alt={buddyPokemon.name}
                      width={80}
                      height={80}
                      className="drop-shadow-lg mx-auto"
                    />
                  </button>
                  <p className="font-bold text-sm text-gray-700 mt-1">{buddyPokemon.name}</p>
                  <p className="text-[10px] text-purple-400 mt-0.5">Tap me!</p>
                  {buddyReaction && (
                    <div className="text-2xl animate-bounce">{buddyReaction.emoji}</div>
                  )}
                  {buddyLoading && (
                    <p className="text-xs text-purple-400 mt-1 animate-pulse">Thinking...</p>
                  )}
                  {buddyMessage && !buddyLoading && (
                    <div className="mt-2 bg-purple-50 rounded-lg p-2 text-xs text-gray-600 relative">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-50 rotate-45" />
                      <p className="relative">{buddyMessage}</p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowBuddyPicker(true)}
                  className="w-full py-4 border-2 border-dashed border-purple-200 rounded-xl text-purple-400 hover:border-purple-400 hover:text-purple-600 transition-colors text-sm"
                >
                  🤝 Pick a buddy!
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}

      {/* Stamp picker modal */}
      {showStampPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-purple-600">🎭 Pick a Stamp</h3>
              <button
                onClick={() => setShowStampPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-3">
              <input
                type="text"
                placeholder="Search Pokemon..."
                value={stampSearch}
                onChange={(e) => setStampSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-5 gap-2">
                {filteredStampPokemon.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedStamp(p);
                      setShowStampPicker(false);
                      setStampSearch("");
                      playSound("catch", { volume: 0.3 });
                    }}
                    className={`p-2 rounded-xl border-2 hover:border-purple-400 hover:bg-purple-50 transition-all ${
                      selectedStamp?.id === p.id ? "border-purple-500 bg-purple-50" : "border-gray-100"
                    }`}
                  >
                    <Image src={p.image} alt={p.name} width={48} height={48} className="mx-auto" />
                    <p className="text-[9px] text-center text-gray-500 mt-1 truncate">{p.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buddy picker modal */}
      {showBuddyPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-purple-600">🤝 Choose Your Art Buddy</h3>
              <button
                onClick={() => { setShowBuddyPicker(false); setBuddySearchQuery(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-3">
              <input
                type="text"
                placeholder="Search Pokemon..."
                value={buddySearchQuery}
                onChange={(e) => setBuddySearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-4 gap-3">
                {filteredBuddyPokemon.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectBuddy(p)}
                    className="p-3 rounded-xl border-2 border-gray-100 hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center"
                  >
                    <Image src={p.image} alt={p.name} width={56} height={56} className="drop-shadow" />
                    <p className="text-xs font-bold text-gray-600 mt-1">{p.name}</p>
                    <p className="text-[9px] text-gray-400">{p.types.join("/")}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coloring picker modal */}
      {showColoringPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-pink-600">🖍️ Pick a Pokemon to Color</h3>
              <button
                onClick={() => { setShowColoringPicker(false); setColoringSearch(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-3">
              <input
                type="text"
                placeholder="Search Pokemon..."
                value={coloringSearch}
                onChange={(e) => setColoringSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-5 gap-2">
                {filteredColoringPokemon.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadColoringPage(p)}
                    className="p-2 rounded-xl border-2 border-gray-100 hover:border-pink-400 hover:bg-pink-50 transition-all"
                  >
                    <Image src={p.image} alt={p.name} width={48} height={48} className="mx-auto" />
                    <p className="text-[9px] text-center text-gray-500 mt-1 truncate">{p.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type effects picker modal */}
      {showTypeEffects && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-orange-600">⚡ Type Effect Brushes</h3>
              <button
                onClick={() => setShowTypeEffects(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {/* Clear effect option */}
              <button
                onClick={() => selectTypeEffect(null)}
                className={`w-full p-3 rounded-xl border-2 mb-2 text-left flex items-center gap-3 transition-all ${
                  !activeType ? "border-gray-400 bg-gray-50" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">🚫</span>
                <div>
                  <p className="font-bold text-sm">No Effect</p>
                  <p className="text-xs text-gray-400">Regular brush mode</p>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {allTypes.map((type) => {
                  const palette = TYPE_PALETTES[type];
                  if (!palette) return null;
                  const typeEmojis: Record<string, string> = {
                    fire: "🔥", water: "💧", grass: "🌿", electric: "⚡", psychic: "🔮",
                    fairy: "✨", ghost: "👻", dragon: "🐉", ice: "❄️", fighting: "👊",
                    poison: "☠️", ground: "🏜️", flying: "🦅", bug: "🐛", rock: "🪨",
                    dark: "🌑", steel: "⚙️", normal: "⚪",
                  };

                  return (
                    <button
                      key={type}
                      onClick={() => selectTypeEffect(type)}
                      className={`p-3 rounded-xl border-2 text-left flex items-center gap-2 transition-all ${
                        activeType === type
                          ? "border-orange-400 bg-orange-50 shadow"
                          : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/50"
                      }`}
                    >
                      <span className="text-xl">{typeEmojis[type] || "⚪"}</span>
                      <div>
                        <p className="font-bold text-sm capitalize">{type}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {palette.colors.slice(0, 4).map((c, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
