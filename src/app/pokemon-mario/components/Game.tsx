"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  GameState,
  PlayerState,
  PokemonCharacter,
  Level,
  Particle,
  Enemy,
  Collectible,
  PowerUp,
} from '../types';
import { GAME_CONFIG, COLORS } from '../utils/constants';
import { generateLevel } from '../utils/levels';
import { moveAndCollide, checkCollision, calculateCamera } from '../utils/physics';
import { useFixedGameLoop } from '../hooks/useGameLoop';
import { useControls } from '../hooks/useControls';
import { speak, loadVoices } from '@/lib/speech';
import { playSound, preloadCommonSounds } from '@/lib/sounds';
import { pokemon } from '@/data/pokemon';

const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_JUMP_POWER, PLAYER_SPEED, STARTING_LIVES } = GAME_CONFIG;

// Generate playable Pokemon from the full database!
// Pick cute/popular Pokemon that are good for a platformer
const PLAYABLE_POKEMON_IDS = [
  1, 4, 7, 25, 35, 39, 52, 54, 58, 63, 77, 104, 133, 143, 147, 151, 152, 155, 158,
  172, 175, 183, 196, 197, 255, 258, 261, 280, 300, 311, 312, 393, 396, 403, 417,
  427, 447, 495, 501, 504, 519, 531, 572, 587, 613, 650, 653, 656, 677, 700, 722,
  725, 728, 744, 778, 810, 813, 816, 848, 872, 906, 909, 912, 924
];

const getPlayablePokemon = (): PokemonCharacter[] => {
  return PLAYABLE_POKEMON_IDS.map(id => {
    const poke = pokemon.find(p => p.id === id);
    if (!poke) return null;
    return {
      id: poke.id,
      name: poke.name,
      image: poke.image,
      jumpPower: 14 + Math.floor(poke.speed / 30),
      speed: 4.5 + (poke.speed / 50),
      color: poke.color || '#888',
    };
  }).filter(Boolean) as PokemonCharacter[];
};

// Initial player state - always has double jump for kids!
const createInitialPlayer = (pokemon: PokemonCharacter, startPos: { x: number; y: number }): PlayerState => ({
  id: 'player',
  x: startPos.x,
  y: startPos.y,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  velocity: { x: 0, y: 0 },
  isActive: true,
  pokemon,
  lives: STARTING_LIVES,
  coins: 0,
  score: 0,
  isJumping: false,
  isGrounded: false,
  isFacingRight: true,
  isInvincible: false,
  invincibleTimer: 0,
  powerUp: null,
  canDoubleJump: true,  // Always on for kids!
  hasDoubleJumped: false,
});

// Generate particles
const createParticle = (x: number, y: number, type: Particle['type'], color: string): Particle => ({
  id: `particle_${Date.now()}_${Math.random()}`,
  x,
  y,
  vx: (Math.random() - 0.5) * 8,
  vy: (Math.random() - 0.5) * 8 - 2,
  life: 30,
  maxLife: 30,
  color,
  size: 4 + Math.random() * 4,
  type,
});

interface GameProps {
  onBack: () => void;
}

export default function Game({ onBack }: GameProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonCharacter | null>(null);
  const [gameState, setGameState] = useState<GameState['status']>('menu');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [level, setLevel] = useState<Level | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [message, setMessage] = useState('');

  const gameRef = useRef<HTMLDivElement>(null);
  const input = useControls();

  // Get playable Pokemon (memoized)
  const playablePokemon = useMemo(() => getPlayablePokemon(), []);

  // Load sounds and voices on mount
  useEffect(() => {
    loadVoices();
    preloadCommonSounds();
  }, []);

  // Start a new game
  const startGame = useCallback((poke: PokemonCharacter) => {
    setSelectedPokemon(poke);
    const lvl = generateLevel(1);
    setLevel(lvl);
    setCurrentLevelId(1);
    setPlayer(createInitialPlayer(poke, lvl.startPosition));
    setEnemies([...lvl.enemies]);
    setCollectibles([...lvl.collectibles]);
    setPowerUps([...lvl.powerUps]);
    setCamera({ x: 0, y: 0 });
    setParticles([]);
    setGameState('playing');
    setMessage('');
    gameRef.current?.focus();

    // Announce the game start!
    playSound('powerup');
    speak(`Let's go ${poke.name}! Welcome to ${lvl.name}!`, { rate: 1.1, pitch: 1.2 });
  }, []);

  // Load next level - ENDLESS! Always generates a new level
  const loadNextLevel = useCallback(() => {
    if (!player || !selectedPokemon) return;

    const nextLevelId = currentLevelId + 1;

    // Generate a new random level - infinite levels!
    const lvl = generateLevel(nextLevelId);
    setLevel(lvl);
    setCurrentLevelId(nextLevelId);
    setPlayer({
      ...createInitialPlayer(selectedPokemon, lvl.startPosition),
      score: player.score,
      coins: player.coins,
    });
    setEnemies([...lvl.enemies]);
    setCollectibles([...lvl.collectibles]);
    setPowerUps([...lvl.powerUps]);
    setCamera({ x: 0, y: 0 });
    setParticles([]);
    setGameState('playing');
    setMessage('');

    // Announce the new level!
    playSound('powerup');
    speak(`Level ${nextLevelId}! ${lvl.name}!`, { rate: 1.2, pitch: 1.3 });
  }, [currentLevelId, player, selectedPokemon]);

  // Restart current level (generates fresh version)
  const restartLevel = useCallback(() => {
    if (!selectedPokemon || !player) return;

    const lvl = generateLevel(currentLevelId);
    setLevel(lvl);
    setPlayer({
      ...createInitialPlayer(selectedPokemon, lvl.startPosition),
      score: player.score,
      coins: player.coins,
    });
    setEnemies([...lvl.enemies]);
    setCollectibles([...lvl.collectibles]);
    setPowerUps([...lvl.powerUps]);
    setCamera({ x: 0, y: 0 });
    setParticles([]);
    setGameState('playing');
    setMessage('');
  }, [currentLevelId, selectedPokemon, player]);

  // Player takes damage - now just gives invincibility instead of losing lives
  const playerHit = useCallback(() => {
    if (!player || player.isInvincible) return;

    // Just make the player invincible and show particles - no death!
    setPlayer(p => p ? { ...p, isInvincible: true, invincibleTimer: 180 } : null);
    // Add hurt particles
    setParticles(prev => [
      ...prev,
      ...Array(10).fill(0).map(() => createParticle(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2, 'explosion', '#ff4444'))
    ]);
  }, [player]);

  // Main game update loop
  const gameUpdate = useCallback(() => {
    if (gameState !== 'playing' || !level || !player) return;

    // Handle jump input - kids can ALWAYS jump, even in the air!
    let shouldJump = false;
    if (input.jump && !jumpPressed) {
      setJumpPressed(true);
      shouldJump = true;  // Always allow jumping!
    }
    if (!input.jump) {
      setJumpPressed(false);
    }

    // Update player
    setPlayer(prev => {
      if (!prev) return null;

      let newVelX = prev.velocity.x;
      let newVelY = prev.velocity.y;

      // Horizontal movement
      if (input.left) {
        newVelX = Math.max(newVelX - 0.8, -PLAYER_SPEED * (prev.powerUp === 'speedBoost' ? 1.5 : 1));
      }
      if (input.right) {
        newVelX = Math.min(newVelX + 0.8, PLAYER_SPEED * (prev.powerUp === 'speedBoost' ? 1.5 : 1));
      }

      // Jump
      if (shouldJump) {
        const jumpPower = prev.powerUp === 'superJump' ? PLAYER_JUMP_POWER * 1.3 : PLAYER_JUMP_POWER;
        newVelY = -jumpPower;

        // Track double jump
        if (!prev.isGrounded && prev.canDoubleJump) {
          setParticles(p => [...p, ...Array(5).fill(0).map(() => createParticle(prev.x + PLAYER_WIDTH / 2, prev.y + PLAYER_HEIGHT, 'dust', '#aaa'))]);
        }
      }

      const updatedPlayer: PlayerState = {
        ...prev,
        velocity: { x: newVelX, y: newVelY },
        isFacingRight: input.right ? true : input.left ? false : prev.isFacingRight,
        hasDoubleJumped: shouldJump && !prev.isGrounded ? true : prev.hasDoubleJumped,
        invincibleTimer: prev.invincibleTimer > 0 ? prev.invincibleTimer - 1 : 0,
        isInvincible: prev.invincibleTimer > 0,
      };

      // Apply physics and collision
      const afterPhysics = moveAndCollide(updatedPlayer, level.platforms);

      // Check level bounds
      if (afterPhysics.x < 0) {
        afterPhysics.x = 0;
        afterPhysics.velocity.x = 0;
      }
      if (afterPhysics.x > level.width - PLAYER_WIDTH) {
        afterPhysics.x = level.width - PLAYER_WIDTH;
        afterPhysics.velocity.x = 0;
      }

      return afterPhysics;
    });

    // If falling too low, just boost them back up - no respawn needed!
    if (player && player.y > level.height - 100) {
      setPlayer(p => p ? {
        ...p,
        y: level.height - 200,
        velocity: { x: p.velocity.x, y: -15 },  // Bounce them up!
      } : null);
      setParticles(prev => [
        ...prev,
        ...Array(5).fill(0).map(() => createParticle(player.x + PLAYER_WIDTH / 2, level.height - 150, 'sparkle', '#00ff88'))
      ]);
    }

    // Update enemies
    setEnemies(prev => prev.map(enemy => {
      if (enemy.isDefeated) return enemy;

      let newX = enemy.x + enemy.velocity.x * enemy.direction;
      let newDirection = enemy.direction;

      // Patrol behavior
      if (enemy.startX !== undefined && enemy.patrolRange) {
        if (newX < enemy.startX - enemy.patrolRange || newX > enemy.startX + enemy.patrolRange) {
          newDirection *= -1;
        }
      }

      // Flyer movement
      if (enemy.type === 'flyer') {
        enemy.velocity.y = Math.sin(Date.now() / 500) * 2;
      }

      return {
        ...enemy,
        x: newX,
        y: enemy.y + (enemy.velocity.y || 0),
        direction: newDirection,
      };
    }));

    // Check enemy collisions with player
    if (player) {
      enemies.forEach(enemy => {
        if (enemy.isDefeated || !checkCollision(player, enemy)) return;

        // Check if player is stomping (coming from above)
        if (player.velocity.y > 0 && player.y + player.height - 10 < enemy.y + enemy.height / 2) {
          // Defeat enemy
          setEnemies(prev => prev.map(e =>
            e.id === enemy.id ? { ...e, isDefeated: true } : e
          ));
          setPlayer(p => p ? { ...p, velocity: { ...p.velocity, y: -10 }, score: p.score + 100 } : null);
          setParticles(prev => [...prev, ...Array(8).fill(0).map(() => createParticle(enemy.x + 20, enemy.y + 20, 'explosion', '#ffaa00'))]);

          // Sound and occasional speech!
          playSound('pop');
          if (Math.random() > 0.7) {
            speak(`Got ${enemy.pokemon.name}!`, { rate: 1.3, pitch: 1.4 });
          }
        } else if (!player.isInvincible) {
          // Player gets hit
          playerHit();
        }
      });
    }

    // Check collectible collisions
    if (player) {
      collectibles.forEach(col => {
        if (col.isCollected || !checkCollision(player, col)) return;

        setCollectibles(prev => prev.map(c =>
          c.id === col.id ? { ...c, isCollected: true } : c
        ));
        setPlayer(p => p ? {
          ...p,
          coins: p.coins + col.value,
          score: p.score + col.value * 10,
        } : null);
        setParticles(prev => [...prev, ...Array(5).fill(0).map(() => createParticle(col.x + 15, col.y + 15, 'coin', '#ffd700'))]);
        playSound('coin');
      });
    }

    // Check power-up collisions
    if (player) {
      powerUps.forEach(pu => {
        if (pu.isCollected || !checkCollision(player, pu)) return;

        setPowerUps(prev => prev.map(p =>
          p.id === pu.id ? { ...p, isCollected: true } : p
        ));
        setPlayer(p => {
          if (!p) return null;
          const updates: Partial<PlayerState> = { powerUp: pu.type, score: p.score + 500 };
          if (pu.type === 'doubleJump') updates.canDoubleJump = true;
          if (pu.type === 'invincible') {
            updates.isInvincible = true;
            updates.invincibleTimer = 600;
          }
          return { ...p, ...updates };
        });
        setParticles(prev => [...prev, ...Array(10).fill(0).map(() => createParticle(pu.x + 17, pu.y + 17, 'sparkle', '#ff00ff'))]);
        playSound('powerup');
        speak('Power up!', { rate: 1.4, pitch: 1.5 });
      });
    }

    // Check goal
    if (player && level.goalPosition) {
      const goalBounds = { x: level.goalPosition.x, y: level.goalPosition.y - 60, width: 60, height: 80 };
      if (checkCollision(player, goalBounds)) {
        setGameState('levelComplete');
        setMessage(`Level ${currentLevelId} Complete! 🌟`);
        setPlayer(p => p ? { ...p, score: p.score + 1000 } : null);
        playSound('win');
        speak(`Amazing! Level ${currentLevelId} complete!`, { rate: 1.2, pitch: 1.3 });
      }
    }

    // Update camera
    if (player) {
      setCamera(prev => calculateCamera(player.x, player.y, prev, level.width, level.height));
    }

    // Update particles
    setParticles(prev => prev
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2, life: p.life - 1 }))
      .filter(p => p.life > 0)
      .slice(-GAME_CONFIG.PARTICLE_LIMIT)
    );

  }, [gameState, level, player, input, enemies, collectibles, powerUps, jumpPressed, currentLevelId, playerHit]);

  // Run game loop
  useFixedGameLoop(gameUpdate, gameState === 'playing');

  // Focus game on mount
  useEffect(() => {
    gameRef.current?.focus();
  }, []);

  // Theme colors
  const themeColors = level ? COLORS.themes[level.theme] : COLORS.themes.grassland;

  return (
    <div
      ref={gameRef}
      className="outline-none"
      tabIndex={0}
      style={{
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${themeColors.sky[0]}, ${themeColors.sky[1]})`,
        }}
      />

      {/* Game Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Pokemon Mario! 🍄</h1>
            <p className="text-gray-600 mb-2">Endless adventure with all 1008 Pokemon!</p>
            <p className="text-sm text-gray-500 mb-4">Choose your Pokemon to start:</p>

            <div className="flex justify-center gap-3 mb-6 flex-wrap max-h-[40vh] overflow-y-auto p-2">
              {playablePokemon.slice(0, 24).map(poke => (
                <button
                  key={poke.id}
                  onClick={() => startGame(poke)}
                  className="p-2 rounded-xl hover:scale-110 transition-transform hover:shadow-lg"
                  style={{ backgroundColor: poke.color + '40' }}
                >
                  <Image src={poke.image} alt={poke.name} width={48} height={48} />
                  <div className="text-xs font-bold truncate max-w-[60px]">{poke.name}</div>
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-500 mb-4">
              <p>⬅️➡️ Move | ⬆️ Jump anytime! | Stomp on Pokemon!</p>
              <p className="text-xs mt-1">You can jump as many times as you want - even in the air!</p>
            </div>

            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              ← Back to Games
            </button>
          </div>
        </div>
      )}

      {/* Game World */}
      {level && player && (
        <div
          className="absolute"
          style={{
            transform: `translate(${-camera.x}px, ${-camera.y}px)`,
            width: level.width,
            height: level.height,
          }}
        >
          {/* Platforms */}
          {level.platforms.map(platform => (
            <div
              key={platform.id}
              className="absolute rounded"
              style={{
                left: platform.x,
                top: platform.y,
                width: platform.width,
                height: platform.height,
                backgroundColor: COLORS.platforms[platform.type],
                border: '3px solid rgba(0,0,0,0.2)',
                boxShadow: 'inset 0 -4px rgba(0,0,0,0.1)',
              }}
            />
          ))}

          {/* Goal Flag */}
          {level.goalPosition && (
            <div
              className="absolute"
              style={{ left: level.goalPosition.x, top: level.goalPosition.y - 80 }}
            >
              <div className="text-6xl">🚩</div>
              <div className="text-center font-bold text-white text-shadow">GOAL</div>
            </div>
          )}

          {/* Collectibles */}
          {collectibles.filter(c => !c.isCollected).map(col => (
            <div
              key={col.id}
              className="absolute animate-bounce"
              style={{
                left: col.x,
                top: col.y + Math.sin((Date.now() / 300) + (col.floatOffset || 0)) * 5,
              }}
            >
              <div className="text-3xl">
                {col.type === 'pokeball' ? '🔴' :
                 col.type === 'greatball' ? '🔵' :
                 col.type === 'ultraball' ? '🟡' :
                 col.type === 'masterball' ? '🟣' : '🍒'}
              </div>
            </div>
          ))}

          {/* Power-ups */}
          {powerUps.filter(p => !p.isCollected).map(pu => (
            <div
              key={pu.id}
              className="absolute animate-pulse"
              style={{ left: pu.x, top: pu.y }}
            >
              <div className="text-3xl">
                {pu.type === 'speedBoost' ? '⚡' :
                 pu.type === 'superJump' ? '🦘' :
                 pu.type === 'doubleJump' ? '🪽' :
                 pu.type === 'invincible' ? '⭐' : '🔥'}
              </div>
            </div>
          ))}

          {/* Enemies */}
          {enemies.filter(e => !e.isDefeated).map(enemy => (
            <div
              key={enemy.id}
              className="absolute transition-transform"
              style={{
                left: enemy.x,
                top: enemy.y,
                transform: `scaleX(${enemy.direction})`,
              }}
            >
              <Image
                src={enemy.pokemon.image}
                alt={enemy.pokemon.name}
                width={40}
                height={40}
              />
            </div>
          ))}

          {/* Player */}
          <div
            className="absolute transition-transform"
            style={{
              left: player.x,
              top: player.y,
              transform: `scaleX(${player.isFacingRight ? 1 : -1})`,
              opacity: player.isInvincible && Math.floor(Date.now() / 100) % 2 ? 0.5 : 1,
            }}
          >
            <Image
              src={player.pokemon.image}
              alt={player.pokemon.name}
              width={PLAYER_WIDTH}
              height={PLAYER_HEIGHT}
              className={player.isJumping ? 'rotate-12' : ''}
            />
            {player.powerUp === 'invincible' && (
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-300/50" />
            )}
          </div>

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life / p.maxLife,
              }}
            />
          ))}
        </div>
      )}

      {/* HUD */}
      {player && gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40">
          <div className="bg-black/50 backdrop-blur rounded-xl p-3 text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-2xl">🔴</span>
                <span className="text-xl font-bold">{player.coins}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xl">⭐</span>
                <span className="text-xl font-bold">{player.score}</span>
              </div>
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-xl p-3 text-white">
            <div className="text-xl font-bold">Level {currentLevelId}</div>
            {level && <div className="text-sm text-gray-300">{level.name}</div>}
          </div>

          {player.powerUp && (
            <div className="bg-purple-500/80 backdrop-blur rounded-xl p-3 text-white animate-pulse">
              <div className="text-lg font-bold">
                {player.powerUp === 'speedBoost' ? '⚡ SPEED!' :
                 player.powerUp === 'superJump' ? '🦘 SUPER JUMP!' :
                 player.powerUp === 'doubleJump' ? '🪽 DOUBLE JUMP!' :
                 player.powerUp === 'invincible' ? '⭐ INVINCIBLE!' : '🔥 FIRE!'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Level Complete */}
      {gameState === 'levelComplete' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-3xl p-8 text-center shadow-2xl animate-bounce">
            <div className="text-6xl mb-4">🌟</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{message}</h2>
            <p className="text-xl text-gray-600 mb-2">Score: {player?.score}</p>
            <p className="text-lg text-gray-500 mb-6">Coins: {player?.coins} 🔴</p>
            <button
              onClick={loadNextLevel}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-xl transition-colors animate-pulse"
            >
              Next Adventure! →
            </button>
          </div>
        </div>
      )}



      {/* Controls hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur rounded-full px-4 py-2 text-white text-sm z-40">
          ⬅️➡️ Move | ⬆️ Jump (press twice!) | Stomp on Pokemon!
        </div>
      )}
    </div>
  );
}
