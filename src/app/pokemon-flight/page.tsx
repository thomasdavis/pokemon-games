'use client';

import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Sky,
  Cloud,
  Environment,
  Float,
  Text3D,
  Center,
  useTexture,
  Trail,
  Sparkles,
  Stars,
  useGLTF,
  Html,
  KeyboardControls,
  useKeyboardControls,
  PointerLockControls,
  PerspectiveCamera,
  OrbitControls,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  DepthOfField,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import { pokemon as allPokemon, Pokemon } from '@/data/pokemon';
import { playSound, success, levelUp, whoosh, coin, pop } from '@/lib/sounds';
import { speak, stopSpeaking } from '@/lib/speech';
import { createNoise2D, createNoise3D } from 'simplex-noise';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface GameState {
  score: number;
  rings: number;
  coins: number;
  speed: number;
  altitude: number;
  currentPokemon: Pokemon;
  nearbyPokemon: NearbyPokemon[];
  gameMode: 'free' | 'race' | 'collect' | 'catch';
  timeOfDay: number; // 0-24
  weather: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  boostActive: boolean;
  boostFuel: number;
}

interface NearbyPokemon {
  pokemon: Pokemon;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  caught: boolean;
}

interface RingData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  collected: boolean;
  color: string;
  size: number;
}

interface CoinData {
  position: THREE.Vector3;
  collected: boolean;
  value: number;
}

// Flying Pokemon only (has Flying type or can levitate)
const flyingPokemon = allPokemon.filter(p =>
  p.types.includes('Flying') ||
  p.types.includes('Dragon') ||
  p.types.includes('Psychic') ||
  p.is_legendary ||
  p.is_mythical ||
  ['Butterfree', 'Beedrill', 'Pidgey', 'Pidgeotto', 'Pidgeot', 'Spearow', 'Fearow',
   'Zubat', 'Golbat', 'Farfetchd', 'Doduo', 'Dodrio', 'Articuno', 'Zapdos', 'Moltres',
   'Dragonite', 'Hoothoot', 'Noctowl', 'Crobat', 'Togetic', 'Natu', 'Xatu', 'Murkrow',
   'Gligar', 'Delibird', 'Skarmory', 'Lugia', 'Ho-Oh', 'Beautifly', 'Dustox', 'Taillow',
   'Swellow', 'Wingull', 'Pelipper', 'Masquerain', 'Ninjask', 'Swablu', 'Altaria',
   'Tropius', 'Salamence', 'Latias', 'Latios', 'Rayquaza', 'Starly', 'Staravia',
   'Staraptor', 'Mothim', 'Combee', 'Vespiquen', 'Drifloon', 'Drifblim', 'Honchkrow',
   'Chatot', 'Togekiss', 'Yanmega', 'Gliscor', 'Rotom', 'Giratina', 'Shaymin',
   'Arceus', 'Unfezant', 'Woobat', 'Swoobat', 'Sigilyph', 'Archen', 'Archeops',
   'Ducklett', 'Swanna', 'Emolga', 'Rufflet', 'Braviary', 'Vullaby', 'Mandibuzz',
   'Hydreigon', 'Volcarona', 'Tornadus', 'Thundurus', 'Landorus', 'Reshiram',
   'Zekrom', 'Kyurem', 'Fletchling', 'Fletchinder', 'Talonflame', 'Vivillon',
   'Hawlucha', 'Noibat', 'Noivern', 'Yveltal', 'Rowlet', 'Dartrix', 'Decidueye',
   'Pikipek', 'Trumbeak', 'Toucannon', 'Oricorio', 'Minior', 'Drampa', 'Tapu Koko',
   'Lunala', 'Celesteela', 'Kartana', 'Naganadel', 'Corviknight', 'Cramorant',
   'Rookidee', 'Corvisquire'].includes(p.name)
);

const WORLD_SIZE = 2000;
const TERRAIN_SEGMENTS = 128;
const NUM_TREES = 300;
const NUM_ROCKS = 150;
const NUM_CLOUDS = 50;
const NUM_RINGS = 30;
const NUM_COINS = 100;
const NUM_WILD_POKEMON = 20;

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'up', keys: ['Space'] },
  { name: 'down', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'boost', keys: ['KeyE'] },
  { name: 'brake', keys: ['KeyQ'] },
  { name: 'roll_left', keys: ['KeyZ'] },
  { name: 'roll_right', keys: ['KeyX'] },
  { name: 'catch', keys: ['KeyC'] },
];

// ============================================================================
// NOISE GENERATORS
// ============================================================================

const noise2D = createNoise2D();
const noise3D = createNoise3D();

function fbm2D(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

// ============================================================================
// TERRAIN GENERATION
// ============================================================================

function generateTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(
    WORLD_SIZE,
    WORLD_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  );

  const positions = geometry.attributes.position.array as Float32Array;
  const colors = new Float32Array(positions.length);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];

    // Multi-octave noise for varied terrain
    const baseHeight = fbm2D(x * 0.002, y * 0.002, 6) * 150;
    const mountainNoise = Math.max(0, fbm2D(x * 0.001 + 100, y * 0.001 + 100, 4)) * 200;
    const detailNoise = fbm2D(x * 0.01, y * 0.01, 2) * 10;

    // Create valleys near water
    const distFromCenter = Math.sqrt(x * x + y * y) / (WORLD_SIZE * 0.5);
    const valleyFactor = Math.max(0, 1 - distFromCenter * 0.5);

    const height = baseHeight + mountainNoise * valleyFactor + detailNoise;
    positions[i + 2] = Math.max(-5, height); // Keep some areas underwater

    // Color based on height
    const normalizedHeight = (height + 50) / 300;
    if (height < 0) {
      // Sand/beach
      colors[i] = 0.76;
      colors[i + 1] = 0.70;
      colors[i + 2] = 0.50;
    } else if (height < 30) {
      // Grass
      colors[i] = 0.2 + normalizedHeight * 0.1;
      colors[i + 1] = 0.6 + normalizedHeight * 0.2;
      colors[i + 2] = 0.2;
    } else if (height < 100) {
      // Forest
      colors[i] = 0.15;
      colors[i + 1] = 0.4 + normalizedHeight * 0.1;
      colors[i + 2] = 0.15;
    } else if (height < 180) {
      // Rock/stone
      colors[i] = 0.4 + normalizedHeight * 0.1;
      colors[i + 1] = 0.38 + normalizedHeight * 0.1;
      colors[i + 2] = 0.35;
    } else {
      // Snow caps
      colors[i] = 0.9;
      colors[i + 1] = 0.92;
      colors[i + 2] = 0.95;
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

// ============================================================================
// LOW-POLY TREE COMPONENT
// ============================================================================

function LowPolyTree({ position, scale = 1 }: { position: THREE.Vector3; scale?: number }) {
  const trunkHeight = 2 + Math.random() * 2;
  const foliageSize = 1.5 + Math.random() * 1.5;
  const treeType = Math.random();

  // Varied green colors
  const greens = [
    '#228B22', '#2E8B57', '#3CB371', '#006400', '#32CD32',
    '#90EE90', '#00FF7F', '#7CFC00', '#ADFF2F', '#9ACD32'
  ];
  const foliageColor = greens[Math.floor(Math.random() * greens.length)];
  const trunkColor = Math.random() > 0.5 ? '#8B4513' : '#A0522D';

  if (treeType < 0.4) {
    // Conical pine tree
    return (
      <group position={position} scale={scale}>
        {/* Trunk */}
        <mesh position={[0, trunkHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.25, trunkHeight, 6]} />
          <meshStandardMaterial color={trunkColor} flatShading />
        </mesh>
        {/* Multiple cone layers */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0, trunkHeight + i * foliageSize * 0.6, 0]}
            castShadow
          >
            <coneGeometry args={[foliageSize * (1 - i * 0.25), foliageSize * 1.5, 8]} />
            <meshStandardMaterial color={foliageColor} flatShading />
          </mesh>
        ))}
      </group>
    );
  } else if (treeType < 0.7) {
    // Round deciduous tree
    return (
      <group position={position} scale={scale}>
        {/* Trunk */}
        <mesh position={[0, trunkHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.35, trunkHeight, 6]} />
          <meshStandardMaterial color={trunkColor} flatShading />
        </mesh>
        {/* Foliage spheres */}
        <mesh position={[0, trunkHeight + foliageSize * 0.5, 0]} castShadow>
          <icosahedronGeometry args={[foliageSize, 1]} />
          <meshStandardMaterial color={foliageColor} flatShading />
        </mesh>
        <mesh position={[foliageSize * 0.4, trunkHeight + foliageSize * 0.3, foliageSize * 0.3]} castShadow>
          <icosahedronGeometry args={[foliageSize * 0.7, 1]} />
          <meshStandardMaterial color={foliageColor} flatShading />
        </mesh>
        <mesh position={[-foliageSize * 0.3, trunkHeight + foliageSize * 0.2, -foliageSize * 0.4]} castShadow>
          <icosahedronGeometry args={[foliageSize * 0.6, 1]} />
          <meshStandardMaterial color={foliageColor} flatShading />
        </mesh>
      </group>
    );
  } else {
    // Palm-like tree
    return (
      <group position={position} scale={scale}>
        {/* Curved trunk */}
        <mesh position={[0, trunkHeight / 2, 0]} rotation={[0.1, 0, 0.1]} castShadow>
          <cylinderGeometry args={[0.15, 0.3, trunkHeight, 6]} />
          <meshStandardMaterial color="#DEB887" flatShading />
        </mesh>
        {/* Fronds */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * Math.PI / 3) * 0.5,
              trunkHeight,
              Math.sin(i * Math.PI / 3) * 0.5
            ]}
            rotation={[
              Math.PI / 4,
              i * Math.PI / 3,
              0
            ]}
            castShadow
          >
            <coneGeometry args={[0.3, foliageSize * 2, 4]} />
            <meshStandardMaterial color="#228B22" flatShading />
          </mesh>
        ))}
      </group>
    );
  }
}

// ============================================================================
// LOW-POLY ROCK COMPONENT
// ============================================================================

function LowPolyRock({ position, scale = 1 }: { position: THREE.Vector3; scale?: number }) {
  const rockType = Math.random();
  const rockColors = ['#696969', '#808080', '#A9A9A9', '#778899', '#708090', '#5F6B7C'];
  const color = rockColors[Math.floor(Math.random() * rockColors.length)];

  // Random rotation for variety
  const rotation = useMemo(() => new THREE.Euler(
    Math.random() * Math.PI * 0.3,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 0.3
  ), []);

  if (rockType < 0.5) {
    // Cluster of rocks
    return (
      <group position={position} scale={scale} rotation={rotation}>
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.8, -0.3, 0.5]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[-0.5, -0.2, -0.7]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    );
  } else {
    // Single boulder
    return (
      <group position={position} scale={scale} rotation={rotation}>
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    );
  }
}

// ============================================================================
// WATER COMPONENT
// ============================================================================

function Water() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      // Subtle wave animation through opacity variation
      material.opacity = 0.7 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <mesh
      ref={waterRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, 0]}
      receiveShadow
    >
      <planeGeometry args={[WORLD_SIZE * 1.5, WORLD_SIZE * 1.5, 64, 64]} />
      <meshStandardMaterial
        color="#1E90FF"
        transparent
        opacity={0.75}
        metalness={0.3}
        roughness={0.1}
        flatShading
      />
    </mesh>
  );
}

// ============================================================================
// ANIMATED WATER WITH WAVES
// ============================================================================

function AnimatedWater() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  // Store original positions
  const originalPositions = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (geometryRef.current) {
      originalPositions.current = new Float32Array(
        geometryRef.current.attributes.position.array
      );
    }
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current && geometryRef.current && originalPositions.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      const time = clock.elapsedTime;

      for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions.current[i];
        const y = originalPositions.current[i + 1];

        // Multiple wave frequencies
        const wave1 = Math.sin(x * 0.02 + time) * 2;
        const wave2 = Math.sin(y * 0.015 + time * 0.8) * 1.5;
        const wave3 = Math.sin((x + y) * 0.01 + time * 1.2) * 1;

        positions[i + 2] = wave1 + wave2 + wave3;
      }

      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      receiveShadow
    >
      <planeGeometry ref={geometryRef} args={[WORLD_SIZE * 1.5, WORLD_SIZE * 1.5, 128, 128]} />
      <meshStandardMaterial
        color="#4169E1"
        transparent
        opacity={0.8}
        metalness={0.4}
        roughness={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// COLLECTIBLE RING COMPONENT
// ============================================================================

function CollectibleRing({
  data,
  onCollect,
  playerPosition
}: {
  data: RingData;
  onCollect: () => void;
  playerPosition: THREE.Vector3;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const [collected, setCollected] = useState(false);
  const glowIntensity = useRef(0);

  useFrame(({ clock }) => {
    if (!ringRef.current || collected) return;

    // Rotate ring
    ringRef.current.rotation.z = clock.elapsedTime * 2;

    // Pulsing glow effect
    glowIntensity.current = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.3;

    // Check collision with player
    const distance = ringRef.current.position.distanceTo(playerPosition);
    if (distance < data.size + 3) {
      setCollected(true);
      onCollect();
      playSound('coin', { volume: 0.5, rate: 1.2 });
    }
  });

  if (collected) return null;

  return (
    <group ref={ringRef} position={data.position} rotation={data.rotation}>
      {/* Main ring */}
      <mesh>
        <torusGeometry args={[data.size, data.size * 0.15, 8, 24]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={glowIntensity.current}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Inner glow ring */}
      <mesh>
        <torusGeometry args={[data.size * 0.9, data.size * 0.05, 8, 24]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>
      {/* Sparkle effect */}
      <Sparkles
        count={20}
        scale={data.size * 2}
        size={2}
        speed={0.5}
        color={data.color}
      />
    </group>
  );
}

// ============================================================================
// COLLECTIBLE COIN COMPONENT
// ============================================================================

function CollectibleCoin({
  data,
  onCollect,
  playerPosition
}: {
  data: CoinData;
  onCollect: () => void;
  playerPosition: THREE.Vector3;
}) {
  const coinRef = useRef<THREE.Mesh>(null);
  const [collected, setCollected] = useState(false);

  useFrame(({ clock }) => {
    if (!coinRef.current || collected) return;

    // Spin coin
    coinRef.current.rotation.y = clock.elapsedTime * 3;
    // Bob up and down
    coinRef.current.position.y = data.position.y + Math.sin(clock.elapsedTime * 2) * 0.5;

    // Check collision
    const distance = coinRef.current.position.distanceTo(playerPosition);
    if (distance < 3) {
      setCollected(true);
      onCollect();
      coin();
    }
  });

  if (collected) return null;

  const coinColor = data.value > 1 ? '#FFD700' : '#C0C0C0';

  return (
    <mesh ref={coinRef} position={data.position}>
      <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
      <meshStandardMaterial
        color={coinColor}
        emissive={coinColor}
        emissiveIntensity={0.3}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// WILD POKEMON COMPONENT
// ============================================================================

function WildPokemon({
  data,
  playerPosition,
  onCatch
}: {
  data: NearbyPokemon;
  playerPosition: THREE.Vector3;
  onCatch: (pokemon: Pokemon) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(data.velocity.clone());
  const targetPos = useRef(data.targetPosition.clone());
  const [caught, setCaught] = useState(false);

  // Calculate Pokemon characteristics
  const isLarge = data.pokemon.height > 15;
  const isSmall = data.pokemon.height < 5;
  const flySpeed = isLarge ? 0.3 : isSmall ? 0.8 : 0.5;
  const bobAmount = isSmall ? 2 : 0.5;

  // Get type color
  const typeColors: Record<string, string> = {
    'Flying': '#A890F0',
    'Dragon': '#7038F8',
    'Psychic': '#F85888',
    'Fire': '#F08030',
    'Water': '#6890F0',
    'Electric': '#F8D030',
    'Grass': '#78C850',
    'Ice': '#98D8D8',
    'Normal': '#A8A878',
    'Fairy': '#EE99AC',
    'Ghost': '#705898',
    'Dark': '#705848',
    'Steel': '#B8B8D0',
    'Rock': '#B8A038',
    'Ground': '#E0C068',
    'Bug': '#A8B820',
    'Poison': '#A040A0',
    'Fighting': '#C03028',
  };

  const primaryColor = typeColors[data.pokemon.types[0]] || '#A8A878';

  useFrame(({ clock }) => {
    if (!groupRef.current || caught) return;

    const time = clock.elapsedTime;

    // Update target position periodically
    if (Math.random() < 0.01) {
      targetPos.current.set(
        data.position.x + (Math.random() - 0.5) * 200,
        50 + Math.random() * 150,
        data.position.z + (Math.random() - 0.5) * 200
      );
    }

    // Move towards target
    const direction = targetPos.current.clone().sub(groupRef.current.position);
    if (direction.length() > 5) {
      direction.normalize().multiplyScalar(flySpeed);
      velocity.current.lerp(direction, 0.02);
    }

    // Apply velocity
    groupRef.current.position.add(velocity.current);

    // Add bobbing motion
    groupRef.current.position.y += Math.sin(time * 2 + data.pokemon.id) * bobAmount * 0.05;

    // Face movement direction
    if (velocity.current.length() > 0.1) {
      const angle = Math.atan2(velocity.current.x, velocity.current.z);
      groupRef.current.rotation.y = angle;
    }

    // Wing flapping for smaller Pokemon
    if (isSmall) {
      const wingAngle = Math.sin(time * 15) * 0.3;
      // Apply to wing meshes if we had them
    }

    // Check if player is trying to catch
    const distToPlayer = groupRef.current.position.distanceTo(playerPosition);
    if (distToPlayer < 8) {
      // Pokemon is catchable - show indicator
    }
  });

  if (caught) return null;

  // Low-poly Pokemon representation
  return (
    <group ref={groupRef} position={data.position}>
      {/* Body */}
      <mesh castShadow>
        <icosahedronGeometry args={[isLarge ? 3 : isSmall ? 1 : 2, 1]} />
        <meshStandardMaterial
          color={primaryColor}
          flatShading
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.5, 0.5, isLarge ? 2.5 : 1.5]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.5, 0.5, isLarge ? 2.5 : 1.5]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Pupils */}
      <mesh position={[0.5, 0.5, isLarge ? 2.7 : 1.7]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-0.5, 0.5, isLarge ? 2.7 : 1.7]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Wings (for flying types) */}
      {data.pokemon.types.includes('Flying') && (
        <>
          <mesh position={[isLarge ? 4 : 2.5, 0, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[isLarge ? 2 : 1, isLarge ? 4 : 2, 4]} />
            <meshStandardMaterial color={primaryColor} flatShading />
          </mesh>
          <mesh position={[isLarge ? -4 : -2.5, 0, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[isLarge ? 2 : 1, isLarge ? 4 : 2, 4]} />
            <meshStandardMaterial color={primaryColor} flatShading />
          </mesh>
        </>
      )}

      {/* Tail */}
      <mesh position={[0, 0, isLarge ? -4 : -2]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[isLarge ? 1 : 0.5, isLarge ? 3 : 1.5, 6]} />
        <meshStandardMaterial color={primaryColor} flatShading />
      </mesh>

      {/* Name label */}
      <Html position={[0, isLarge ? 5 : 3, 0]} center distanceFactor={50}>
        <div className="bg-black/70 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
          {data.pokemon.name}
        </div>
      </Html>

      {/* Sparkles for legendary/mythical */}
      {(data.pokemon.is_legendary || data.pokemon.is_mythical) && (
        <Sparkles
          count={30}
          scale={isLarge ? 8 : 5}
          size={3}
          speed={0.5}
          color="#FFD700"
        />
      )}

      {/* Trail effect */}
      <Trail
        width={isLarge ? 3 : 1}
        length={8}
        color={primaryColor}
        attenuation={(t) => t * t}
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.1]} />
        </mesh>
      </Trail>
    </group>
  );
}

// ============================================================================
// PLAYER POKEMON (Controllable)
// ============================================================================

function PlayerPokemon({
  pokemon,
  onPositionUpdate,
  gameState,
  setGameState,
}: {
  pokemon: Pokemon;
  onPositionUpdate: (pos: THREE.Vector3) => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const rotation = useRef(new THREE.Euler());
  const roll = useRef(0);

  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();

  // Flight physics constants
  const MAX_SPEED = gameState.boostActive ? 2.5 : 1.2;
  const ACCELERATION = 0.05;
  const DECELERATION = 0.02;
  const TURN_SPEED = 0.03;
  const PITCH_SPEED = 0.02;
  const ROLL_SPEED = 0.05;
  const GRAVITY = 0.01;
  const LIFT = 0.015;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const keys = getKeys() as {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      boost: boolean;
      brake: boolean;
      roll_left: boolean;
      roll_right: boolean;
    };

    const time = clock.elapsedTime;

    // Current forward direction
    const forward = new THREE.Vector3(0, 0, 1).applyEuler(rotation.current);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(rotation.current);

    // Speed control
    let targetSpeed = velocity.current.length();

    if (keys.forward) {
      targetSpeed = Math.min(targetSpeed + ACCELERATION, MAX_SPEED);
    } else if (keys.backward || keys.brake) {
      targetSpeed = Math.max(targetSpeed - DECELERATION * 2, 0.1);
    } else {
      // Gradual slowdown
      targetSpeed = Math.max(targetSpeed - DECELERATION * 0.5, 0.3);
    }

    // Boost
    if (keys.boost && gameState.boostFuel > 0) {
      targetSpeed = MAX_SPEED;
      setGameState(prev => ({
        ...prev,
        boostActive: true,
        boostFuel: Math.max(0, prev.boostFuel - 0.5)
      }));
      if (Math.random() < 0.1) {
        whoosh();
      }
    } else {
      setGameState(prev => ({ ...prev, boostActive: false }));
    }

    // Turning (yaw)
    if (keys.left) {
      rotation.current.y += TURN_SPEED * (1 + targetSpeed * 0.5);
      roll.current = Math.min(roll.current + ROLL_SPEED, 0.5);
    } else if (keys.right) {
      rotation.current.y -= TURN_SPEED * (1 + targetSpeed * 0.5);
      roll.current = Math.max(roll.current - ROLL_SPEED, -0.5);
    } else {
      // Return roll to neutral
      roll.current = roll.current * 0.95;
    }

    // Pitch (up/down)
    if (keys.up) {
      rotation.current.x = Math.max(rotation.current.x - PITCH_SPEED, -Math.PI / 3);
    } else if (keys.down) {
      rotation.current.x = Math.min(rotation.current.x + PITCH_SPEED, Math.PI / 4);
    } else {
      // Return to level flight gradually
      rotation.current.x *= 0.98;
    }

    // Manual roll
    if (keys.roll_left) {
      roll.current = Math.min(roll.current + ROLL_SPEED * 2, Math.PI);
    } else if (keys.roll_right) {
      roll.current = Math.max(roll.current - ROLL_SPEED * 2, -Math.PI);
    }

    // Apply physics
    const newVelocity = forward.multiplyScalar(targetSpeed);

    // Add lift based on speed
    newVelocity.y += targetSpeed * LIFT;

    // Add gravity
    newVelocity.y -= GRAVITY;

    velocity.current.lerp(newVelocity, 0.1);

    // Update position
    groupRef.current.position.add(velocity.current);

    // Keep above water and below ceiling
    groupRef.current.position.y = Math.max(5, Math.min(groupRef.current.position.y, 500));

    // Keep in world bounds (wrap around)
    const bounds = WORLD_SIZE * 0.4;
    if (groupRef.current.position.x > bounds) groupRef.current.position.x = -bounds;
    if (groupRef.current.position.x < -bounds) groupRef.current.position.x = bounds;
    if (groupRef.current.position.z > bounds) groupRef.current.position.z = -bounds;
    if (groupRef.current.position.z < -bounds) groupRef.current.position.z = bounds;

    // Apply rotation
    groupRef.current.rotation.set(
      rotation.current.x,
      rotation.current.y,
      roll.current
    );

    // Wing flapping animation
    const flapSpeed = 5 + targetSpeed * 10;
    const flapAmount = Math.sin(time * flapSpeed) * 0.3;

    // Update camera to follow
    const cameraOffset = new THREE.Vector3(0, 8, -25);
    cameraOffset.applyEuler(new THREE.Euler(0, rotation.current.y, 0));

    const targetCameraPos = groupRef.current.position.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(groupRef.current.position);

    // Update game state
    onPositionUpdate(groupRef.current.position.clone());
    setGameState(prev => ({
      ...prev,
      speed: Math.round(targetSpeed * 100),
      altitude: Math.round(groupRef.current!.position.y),
      boostFuel: Math.min(100, prev.boostFuel + (keys.boost ? 0 : 0.1)), // Regenerate boost
    }));
  });

  // Pokemon color based on type
  const typeColors: Record<string, string> = {
    'Flying': '#A890F0',
    'Dragon': '#7038F8',
    'Psychic': '#F85888',
    'Fire': '#F08030',
    'Water': '#6890F0',
    'Electric': '#F8D030',
    'Grass': '#78C850',
    'Normal': '#A8A878',
  };

  const primaryColor = typeColors[pokemon.types[0]] || '#A8A878';
  const isLarge = pokemon.height > 15;
  const size = isLarge ? 2 : 1;

  return (
    <group ref={groupRef} position={[0, 100, 0]}>
      {/* Main body */}
      <mesh castShadow>
        <capsuleGeometry args={[size, size * 2, 8, 16]} />
        <meshStandardMaterial color={primaryColor} flatShading />
      </mesh>

      {/* Head */}
      <mesh position={[0, size * 0.5, size * 1.5]} castShadow>
        <sphereGeometry args={[size * 0.8, 8, 8]} />
        <meshStandardMaterial color={primaryColor} flatShading />
      </mesh>

      {/* Eyes */}
      <mesh position={[size * 0.3, size * 0.7, size * 2]}>
        <sphereGeometry args={[size * 0.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-size * 0.3, size * 0.7, size * 2]}>
        <sphereGeometry args={[size * 0.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Wings */}
      <group>
        {/* Left wing */}
        <mesh position={[size * 2, 0, 0]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[size * 3, size * 0.2, size * 2]} />
          <meshStandardMaterial color={primaryColor} flatShading />
        </mesh>
        {/* Right wing */}
        <mesh position={[-size * 2, 0, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[size * 3, size * 0.2, size * 2]} />
          <meshStandardMaterial color={primaryColor} flatShading />
        </mesh>
      </group>

      {/* Tail */}
      <mesh position={[0, 0, -size * 2]} rotation={[-0.3, 0, 0]}>
        <coneGeometry args={[size * 0.5, size * 2, 6]} />
        <meshStandardMaterial color={primaryColor} flatShading />
      </mesh>

      {/* Boost effect */}
      {gameState.boostActive && (
        <>
          <Trail
            width={3}
            length={20}
            color="#FF6B00"
            attenuation={(t) => t * t}
          >
            <mesh position={[0, 0, -size * 3]} visible={false}>
              <sphereGeometry args={[0.1]} />
            </mesh>
          </Trail>
          <Sparkles
            count={50}
            scale={5}
            size={5}
            speed={2}
            color="#FFAA00"
            position={[0, 0, -size * 2]}
          />
        </>
      )}

      {/* Point light for visibility */}
      <pointLight intensity={0.5} distance={20} color={primaryColor} />
    </group>
  );
}

// ============================================================================
// TERRAIN COMPONENT
// ============================================================================

function Terrain() {
  const geometry = useMemo(() => generateTerrainGeometry(), []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        vertexColors
        flatShading
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// ENVIRONMENT (Trees, Rocks, Clouds)
// ============================================================================

function GameEnvironment() {
  // Generate tree positions
  const trees = useMemo(() => {
    const positions: { position: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < NUM_TREES; i++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.8;

      // Get terrain height at this position
      const height = fbm2D(x * 0.002, z * 0.002, 6) * 150 +
                     Math.max(0, fbm2D(x * 0.001 + 100, z * 0.001 + 100, 4)) * 100;

      // Only place trees on land above water level
      if (height > 5 && height < 120) {
        positions.push({
          position: new THREE.Vector3(x, height, z),
          scale: 0.8 + Math.random() * 0.8,
        });
      }
    }
    return positions;
  }, []);

  // Generate rock positions
  const rocks = useMemo(() => {
    const positions: { position: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < NUM_ROCKS; i++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.8;

      const height = fbm2D(x * 0.002, z * 0.002, 6) * 150 +
                     Math.max(0, fbm2D(x * 0.001 + 100, z * 0.001 + 100, 4)) * 100;

      if (height > 0) {
        positions.push({
          position: new THREE.Vector3(x, height, z),
          scale: 1 + Math.random() * 3,
        });
      }
    }
    return positions;
  }, []);

  return (
    <>
      {/* Trees */}
      {trees.map((tree, i) => (
        <LowPolyTree key={`tree-${i}`} position={tree.position} scale={tree.scale} />
      ))}

      {/* Rocks */}
      {rocks.map((rock, i) => (
        <LowPolyRock key={`rock-${i}`} position={rock.position} scale={rock.scale} />
      ))}

      {/* Volumetric clouds */}
      {Array.from({ length: NUM_CLOUDS }).map((_, i) => (
        <Cloud
          key={`cloud-${i}`}
          position={[
            (Math.random() - 0.5) * WORLD_SIZE,
            150 + Math.random() * 200,
            (Math.random() - 0.5) * WORLD_SIZE,
          ]}
          speed={0.2}
          opacity={0.5 + Math.random() * 0.3}
          width={30 + Math.random() * 50}
          depth={10}
          segments={20}
        />
      ))}
    </>
  );
}

// ============================================================================
// GAME COLLECTIBLES
// ============================================================================

function GameCollectibles({
  playerPosition,
  gameState,
  setGameState,
}: {
  playerPosition: THREE.Vector3;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  // Generate rings
  const rings = useMemo<RingData[]>(() => {
    const ringData: RingData[] = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

    for (let i = 0; i < NUM_RINGS; i++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
      const y = 30 + Math.random() * 200;

      ringData.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        collected: false,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 4,
      });
    }
    return ringData;
  }, []);

  // Generate coins
  const coins = useMemo<CoinData[]>(() => {
    const coinData: CoinData[] = [];

    for (let i = 0; i < NUM_COINS; i++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.7;
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.7;
      const y = 20 + Math.random() * 150;

      coinData.push({
        position: new THREE.Vector3(x, y, z),
        collected: false,
        value: Math.random() > 0.9 ? 5 : 1,
      });
    }
    return coinData;
  }, []);

  const handleRingCollect = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      rings: prev.rings + 1,
      score: prev.score + 100,
    }));
  }, [setGameState]);

  const handleCoinCollect = useCallback((value: number) => {
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + value,
      score: prev.score + value * 10,
    }));
  }, [setGameState]);

  return (
    <>
      {rings.map((ring, i) => (
        <CollectibleRing
          key={`ring-${i}`}
          data={ring}
          playerPosition={playerPosition}
          onCollect={handleRingCollect}
        />
      ))}
      {coins.map((coinData, i) => (
        <CollectibleCoin
          key={`coin-${i}`}
          data={coinData}
          playerPosition={playerPosition}
          onCollect={() => handleCoinCollect(coinData.value)}
        />
      ))}
    </>
  );
}

// ============================================================================
// WILD POKEMON SYSTEM
// ============================================================================

function WildPokemonSystem({
  playerPosition,
  gameState,
  setGameState,
}: {
  playerPosition: THREE.Vector3;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const wildPokemon = useMemo<NearbyPokemon[]>(() => {
    const wild: NearbyPokemon[] = [];

    for (let i = 0; i < NUM_WILD_POKEMON; i++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
      const y = 50 + Math.random() * 200;

      const randomPokemon = flyingPokemon[Math.floor(Math.random() * flyingPokemon.length)];

      wild.push({
        pokemon: randomPokemon,
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0,
          (Math.random() - 0.5) * 0.5
        ),
        targetPosition: new THREE.Vector3(x + 50, y, z + 50),
        caught: false,
      });
    }

    return wild;
  }, []);

  const handleCatch = useCallback((pokemon: Pokemon) => {
    success();
    speak(`You caught ${pokemon.name}!`, { rate: 1.1, pitch: 1.2 });
    setGameState(prev => ({
      ...prev,
      score: prev.score + (pokemon.is_legendary ? 1000 : pokemon.is_mythical ? 500 : 100),
    }));
  }, [setGameState]);

  return (
    <>
      {wildPokemon.map((wp, i) => (
        <WildPokemon
          key={`wild-${i}`}
          data={wp}
          playerPosition={playerPosition}
          onCatch={handleCatch}
        />
      ))}
    </>
  );
}

// ============================================================================
// HUD (Heads-Up Display)
// ============================================================================

function HUD({ gameState }: { gameState: GameState }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Speed indicator (left) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="text-xs text-gray-400 mb-1">SPEED</div>
          <div className="text-4xl font-bold">{gameState.speed}</div>
          <div className="text-xs text-gray-400">KM/H</div>

          {/* Speed bar */}
          <div className="w-32 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
              style={{ width: `${Math.min(100, gameState.speed / 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Altitude indicator (right) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="text-xs text-gray-400 mb-1">ALTITUDE</div>
          <div className="text-4xl font-bold">{gameState.altitude}</div>
          <div className="text-xs text-gray-400">METERS</div>

          {/* Altitude bar */}
          <div className="w-32 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
              style={{ width: `${Math.min(100, gameState.altitude / 5)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top bar - Score and collectibles */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-8 py-4 text-white flex gap-8 items-center">
          <div className="text-center">
            <div className="text-xs text-gray-400">SCORE</div>
            <div className="text-2xl font-bold">{gameState.score.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-gray-600" />
          <div className="text-center">
            <div className="text-xs text-yellow-400">🔵 RINGS</div>
            <div className="text-xl font-bold">{gameState.rings}</div>
          </div>
          <div className="w-px h-8 bg-gray-600" />
          <div className="text-center">
            <div className="text-xs text-yellow-400">🪙 COINS</div>
            <div className="text-xl font-bold">{gameState.coins}</div>
          </div>
        </div>
      </div>

      {/* Boost meter (bottom) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-6 py-3 text-white">
          <div className="text-xs text-center text-gray-400 mb-1">BOOST</div>
          <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                gameState.boostActive
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${gameState.boostFuel}%` }}
            />
          </div>
          <div className="text-xs text-center text-gray-400 mt-1">
            {gameState.boostActive ? '🔥 BOOSTING!' : 'Press E to boost'}
          </div>
        </div>
      </div>

      {/* Current Pokemon indicator */}
      <div className="absolute top-8 left-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white flex items-center gap-4">
          <img
            src={gameState.currentPokemon.image}
            alt={gameState.currentPokemon.name}
            className="w-16 h-16 pixelated"
          />
          <div>
            <div className="font-bold text-lg">{gameState.currentPokemon.name}</div>
            <div className="flex gap-1">
              {gameState.currentPokemon.types.map(type => (
                <span
                  key={type}
                  className="text-xs px-2 py-0.5 rounded bg-white/20"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls help (bottom left) */}
      <div className="absolute bottom-8 left-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
          <div className="font-bold mb-2 text-gray-300">CONTROLS</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400">
            <span>W/S</span><span>Speed</span>
            <span>A/D</span><span>Turn</span>
            <span>Space/Shift</span><span>Up/Down</span>
            <span>E</span><span>Boost</span>
            <span>Q</span><span>Brake</span>
            <span>Z/X</span><span>Barrel Roll</span>
          </div>
        </div>
      </div>

      {/* Mini compass (top right) */}
      <div className="absolute top-8 right-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center">
          <div className="text-white text-2xl">🧭</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GAME SCENE
// ============================================================================

function GameScene({
  gameState,
  setGameState
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 100, 0));

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[200, 300, 100]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={1000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />
      <hemisphereLight args={['#87CEEB', '#3CB371', 0.5]} />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={0.5}
      />

      {/* Stars (visible at high altitude) */}
      <Stars
        radius={WORLD_SIZE}
        depth={500}
        count={5000}
        factor={4}
        saturation={0}
        fade
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#87CEEB', 100, WORLD_SIZE * 0.8]} />

      {/* Terrain */}
      <Terrain />

      {/* Water */}
      <AnimatedWater />

      {/* Environment (trees, rocks, clouds) */}
      <GameEnvironment />

      {/* Collectibles */}
      <GameCollectibles
        playerPosition={playerPosition}
        gameState={gameState}
        setGameState={setGameState}
      />

      {/* Wild Pokemon */}
      <WildPokemonSystem
        playerPosition={playerPosition}
        gameState={gameState}
        setGameState={setGameState}
      />

      {/* Player Pokemon */}
      <PlayerPokemon
        pokemon={gameState.currentPokemon}
        onPositionUpdate={setPlayerPosition}
        gameState={gameState}
        setGameState={setGameState}
      />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
        />
        <Vignette
          eskil={false}
          offset={0.1}
          darkness={0.5}
        />
      </EffectComposer>
    </>
  );
}

// ============================================================================
// POKEMON SELECTOR
// ============================================================================

function PokemonSelector({
  onSelect,
  isOpen,
  onClose,
}: {
  onSelect: (pokemon: Pokemon) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filteredPokemon = useMemo(() => {
    const query = search.toLowerCase();
    return flyingPokemon.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.types.some(t => t.toLowerCase().includes(query))
    ).slice(0, 50);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Choose Your Pokemon</h2>
          <input
            type="text"
            placeholder="Search Pokemon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filteredPokemon.map((pokemon) => (
              <button
                key={pokemon.id}
                onClick={() => {
                  onSelect(pokemon);
                  onClose();
                  pop();
                }}
                className="group flex flex-col items-center p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all hover:scale-105"
              >
                <img
                  src={pokemon.image}
                  alt={pokemon.name}
                  className="w-16 h-16 pixelated"
                />
                <span className="text-xs text-white mt-1 truncate w-full text-center">
                  {pokemon.name}
                </span>
                <div className="flex gap-0.5 mt-1">
                  {pokemon.types.slice(0, 2).map(type => (
                    <span
                      key={type}
                      className="text-[8px] px-1 py-0.5 rounded bg-white/20 text-gray-300"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {(pokemon.is_legendary || pokemon.is_mythical) && (
                  <span className="text-yellow-400 text-xs">⭐</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN MENU
// ============================================================================

function MainMenu({ onStart }: { onStart: (pokemon: Pokemon) => void }) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon>(
    flyingPokemon.find(p => p.name === 'Pidgeot') || flyingPokemon[0]
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-400 via-sky-600 to-sky-900 flex flex-col items-center justify-center">
      {/* Animated clouds background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/30 rounded-full animate-pulse"
            style={{
              width: `${100 + Math.random() * 200}px`,
              height: `${50 + Math.random() * 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Pokemon Flight
        </h1>
        <p className="text-xl text-white/80 mb-8">
          Soar through the skies with your Pokemon!
        </p>

        {/* Selected Pokemon preview */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-8 max-w-md mx-auto">
          <img
            src={selectedPokemon.image}
            alt={selectedPokemon.name}
            className="w-32 h-32 mx-auto mb-4 pixelated"
          />
          <h2 className="text-2xl font-bold text-white mb-2">{selectedPokemon.name}</h2>
          <div className="flex gap-2 justify-center mb-4">
            {selectedPokemon.types.map(type => (
              <span
                key={type}
                className="px-3 py-1 rounded-full bg-white/30 text-white text-sm"
              >
                {type}
              </span>
            ))}
          </div>
          <button
            onClick={() => setSelectorOpen(true)}
            className="text-white/70 hover:text-white underline text-sm"
          >
            Choose Different Pokemon
          </button>
        </div>

        <button
          onClick={() => onStart(selectedPokemon)}
          className="px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-2xl font-bold rounded-full shadow-lg hover:scale-105 transition transform hover:shadow-xl"
        >
          Start Flying!
        </button>

        {/* Controls hint */}
        <div className="mt-8 text-white/60 text-sm">
          <p>Use WASD to fly • Space/Shift for altitude • E to boost</p>
        </div>
      </div>

      <PokemonSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={setSelectedPokemon}
      />
    </div>
  );
}

// ============================================================================
// MAIN GAME COMPONENT
// ============================================================================

export default function PokemonFlightGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    rings: 0,
    coins: 0,
    speed: 0,
    altitude: 100,
    currentPokemon: flyingPokemon.find(p => p.name === 'Pidgeot') || flyingPokemon[0],
    nearbyPokemon: [],
    gameMode: 'free',
    timeOfDay: 12,
    weather: 'clear',
    boostActive: false,
    boostFuel: 100,
  });
  const [showSelector, setShowSelector] = useState(false);

  const handleStart = useCallback((pokemon: Pokemon) => {
    setGameState(prev => ({ ...prev, currentPokemon: pokemon }));
    setGameStarted(true);
    levelUp();
    speak(`Let's fly, ${pokemon.name}!`, { rate: 1.1, pitch: 1.2 });
  }, []);

  const handleChangePokemon = useCallback((pokemon: Pokemon) => {
    setGameState(prev => ({ ...prev, currentPokemon: pokemon }));
    setShowSelector(false);
    speak(`Switching to ${pokemon.name}!`);
  }, []);

  if (!gameStarted) {
    return <MainMenu onStart={handleStart} />;
  }

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="w-full h-screen bg-black relative">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 100, -50], fov: 75, near: 0.1, far: 10000 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <GameScene gameState={gameState} setGameState={setGameState} />
          </Suspense>
        </Canvas>

        {/* HUD Overlay */}
        <HUD gameState={gameState} />

        {/* Pokemon selector button */}
        <button
          onClick={() => setShowSelector(true)}
          className="absolute top-8 left-32 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/80 transition z-10"
        >
          Change Pokemon
        </button>

        {/* Pause menu button */}
        <button
          onClick={() => setGameStarted(false)}
          className="absolute top-8 right-32 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/80 transition z-10"
        >
          Menu
        </button>

        {/* Pokemon selector modal */}
        <PokemonSelector
          isOpen={showSelector}
          onClose={() => setShowSelector(false)}
          onSelect={handleChangePokemon}
        />
      </div>
    </KeyboardControls>
  );
}
