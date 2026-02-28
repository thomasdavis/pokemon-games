"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  GameState,
  PlayerState,
  Enemy,
  Projectile,
  PowerUp as PowerUpType,
  Particle,
  BossState,
  PlayerShip,
  WaveDefinition,
  GameInput,
} from '../types';
import { GAME_CONFIG, PLAYER_SHIPS, COLORS } from '../utils/constants';
import { getWave, getWaveEnemyCount, isBossWave } from '../utils/waves';
import { createBoss, getBossPhase, getBossPhaseIndex, generateBossAttack, updateBossMovement } from '../utils/bosses';
import { createPowerUp, shouldSpawnPowerUp, applyPowerUp, ActivePowerUp, getActiveWeapon, getFireRateMultiplier, getSpeedMultiplier, updateActivePowerUps, hasPowerUp } from '../utils/powerups';
import {
  createExplosion,
  createTypeExplosion,
  createThrusterFlame,
  createComboEffect,
  createGrazeEffect,
  createHealEffect,
  createDamageEffect,
  createStarField,
  createBossAura,
  updateParticles,
} from '../utils/particles';
import {
  checkAABBCollision,
  checkGraze,
  getEntityCenter,
  clampToViewport,
  isOutOfBounds,
  getMovementVector,
  getScreenShakeOffset,
  vectorAdd,
  vectorMultiply,
  vectorDistance,
  getAngleToTarget,
  vectorFromAngle,
} from '../utils/physics';
import {
  createComboState,
  updateCombo,
  incrementCombo,
  calculateEnemyKillScore,
  calculateGrazeScore,
  calculateBossHitScore,
  calculateBossDefeatScore,
  getComboMilestone,
  createGameStats,
  GameStats,
} from '../utils/scoring';
import { useFixedGameLoop } from '../hooks/useGameLoop';
import { useControls, getMovementVector as getInputVector } from '../hooks/useControls';
import { pokemonById, typeColors } from '@/data/pokemon';
import {
  playShoot,
  playEnemyHit,
  playEnemyDeath,
  playPlayerHit,
  playPowerUp,
  playBossHit,
  playBossDefeat,
  playBossPhaseChange,
  playComboSound,
  playWaveComplete,
  playGraze,
  playSpecialAbility,
  initializeAudio,
} from '../lib/soundLayers';
import { speakCombo, speakWaveComplete, cancelSpeech } from '../lib/speechDrama';

import HUD from './HUD';
import Particles, { StarField } from './Particles';
import WaveAnnouncer from './WaveAnnouncer';
import BossIntro from './BossIntro';
import GameOver from './GameOver';
import Menu from './Menu';

const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT } = GAME_CONFIG;

// ============ Initial State Creators ============

function createInitialPlayer(ship: PlayerShip): PlayerState {
  return {
    id: 'player',
    x: GAME_CONFIG.PLAYER_START_X - PLAYER_WIDTH / 2,
    y: GAME_CONFIG.PLAYER_START_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocity: { x: 0, y: 0 },
    isActive: true,
    ship,
    health: ship.health,
    maxHealth: ship.health,
    score: 0,
    combo: 0,
    comboTimer: 0,
    comboMultiplier: 1,
    specialCooldown: 0,
    isSpecialActive: false,
    specialTimer: 0,
    isInvincible: false,
    invincibleTimer: 0,
    weapon: 'basic',
    weaponPower: 1,
    isFiring: false,
    lastFireTime: 0,
    grazeCount: 0,
  };
}

// ============ Main Game Component ============

interface GameProps {
  onBack: () => void;
}

export default function Game({ onBack }: GameProps) {
  // ============ Game State ============
  const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'paused' | 'waveIntro' | 'bossIntro' | 'gameOver' | 'victory'>('menu');
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [selectedShip, setSelectedShip] = useState<PlayerShip | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUpType[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [boss, setBoss] = useState<BossState | null>(null);
  const [currentWave, setCurrentWave] = useState(1);
  const [waveDefinition, setWaveDefinition] = useState<WaveDefinition | null>(null);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [enemiesSpawned, setEnemiesSpawned] = useState(0);
  const [spawnTimer, setSpawnTimer] = useState(0);
  const [spawnIndex, setSpawnIndex] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>(createGameStats());
  const [comboState, setComboState] = useState(createComboState());
  const [starField, setStarField] = useState<Particle[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [lastBossPhase, setLastBossPhase] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);
  const input = useControls();
  const playerName = 'Trainer'; // Could come from player context

  // Initialize
  useEffect(() => {
    initializeAudio();
    setStarField(createStarField(80));
  }, []);

  // ============ Start Game ============
  const startGame = useCallback((ship: PlayerShip) => {
    setSelectedShip(ship);
    setPlayer(createInitialPlayer(ship));
    setEnemies([]);
    setProjectiles([]);
    setPowerUps([]);
    setParticles([]);
    setBoss(null);
    setCurrentWave(1);
    setEnemiesRemaining(0);
    setEnemiesSpawned(0);
    setSpawnTimer(0);
    setSpawnIndex(0);
    setScreenShake(0);
    setActivePowerUps([]);
    setGameStats(createGameStats());
    setComboState(createComboState());
    setGameTime(0);
    setLastBossPhase(0);

    // Load first wave
    const wave = getWave(1);
    setWaveDefinition(wave);
    setGameStatus('waveIntro');
  }, []);

  // ============ Wave Management ============
  const startWave = useCallback(() => {
    if (!waveDefinition) return;

    if (waveDefinition.bossWave && waveDefinition.bossId) {
      setGameStatus('bossIntro');
    } else {
      setEnemiesRemaining(getWaveEnemyCount(waveDefinition));
      setEnemiesSpawned(0);
      setSpawnTimer(0);
      setSpawnIndex(0);
      setGameStatus('playing');
    }
  }, [waveDefinition]);

  const startBoss = useCallback(() => {
    if (!waveDefinition?.bossId) return;

    const newBoss = createBoss(waveDefinition.bossId);
    setBoss(newBoss);
    setLastBossPhase(0);
    setGameStatus('playing');
  }, [waveDefinition]);

  const completeWave = useCallback(() => {
    playWaveComplete();
    speakWaveComplete(currentWave);

    setGameStats(prev => ({
      ...prev,
      wavesCompleted: prev.wavesCompleted + 1,
    }));

    // Next wave
    const nextWaveNum = currentWave + 1;
    const nextWave = getWave(nextWaveNum);
    setCurrentWave(nextWaveNum);
    setWaveDefinition(nextWave);
    setBoss(null);
    setEnemies([]);
    setProjectiles([]);

    // Short delay before next wave
    setTimeout(() => {
      setGameStatus('waveIntro');
    }, 1500);
  }, [currentWave]);

  // ============ Spawn Enemy ============
  const spawnEnemy = useCallback((pokemonId: number, behavior: string, x: number, y: number) => {
    const pokemon = pokemonById.get(pokemonId);
    if (!pokemon) return;

    const waveScale = Math.pow(GAME_CONFIG.ENEMY_HEALTH_SCALE, currentWave - 1);
    const speedScale = Math.pow(GAME_CONFIG.ENEMY_SPEED_SCALE, currentWave - 1);

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      x,
      y,
      width: GAME_CONFIG.ENEMY_MIN_SIZE + Math.random() * (GAME_CONFIG.ENEMY_MAX_SIZE - GAME_CONFIG.ENEMY_MIN_SIZE),
      height: GAME_CONFIG.ENEMY_MIN_SIZE + Math.random() * (GAME_CONFIG.ENEMY_MAX_SIZE - GAME_CONFIG.ENEMY_MIN_SIZE),
      velocity: { x: 0, y: 80 * speedScale },
      isActive: true,
      pokemon,
      behavior: behavior as Enemy['behavior'],
      health: Math.floor((pokemon.hp / 2 + 20) * waveScale),
      maxHealth: Math.floor((pokemon.hp / 2 + 20) * waveScale),
      damage: Math.floor(10 + pokemon.attack / 10),
      scoreValue: Math.floor(100 * Math.pow(GAME_CONFIG.SCORE_SCALE, currentWave - 1)),
      fireRate: behavior === 'bomber' || behavior === 'sniper' ? 1 : 0,
      lastFireTime: 0,
      behaviorTimer: 0,
      behaviorPhase: 0,
    };

    setEnemies(prev => [...prev, enemy]);
    setEnemiesSpawned(prev => prev + 1);
  }, [currentWave]);

  // ============ Fire Projectile ============
  const fireProjectile = useCallback((
    x: number,
    y: number,
    vx: number,
    vy: number,
    isPlayer: boolean,
    damage: number,
    weapon: Projectile['type'] = 'basic'
  ) => {
    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      x,
      y,
      width: 8,
      height: 16,
      velocity: { x: vx, y: vy },
      isActive: true,
      damage,
      isPlayerProjectile: isPlayer,
      type: weapon,
      piercing: weapon === 'piercing',
      hitEnemies: new Set(),
    };

    setProjectiles(prev => [...prev.slice(-GAME_CONFIG.MAX_PROJECTILES + 1), projectile]);

    if (isPlayer) {
      playShoot();
      setGameStats(prev => ({ ...prev, totalShots: prev.totalShots + 1 }));
    }
  }, []);

  // ============ Player Damage ============
  const damagePlayer = useCallback((damage: number) => {
    if (!player || player.isInvincible) return;

    setPlayer(prev => {
      if (!prev) return null;

      const newHealth = prev.health - damage;
      if (newHealth <= 0) {
        setGameStatus('gameOver');
        return { ...prev, health: 0 };
      }

      return {
        ...prev,
        health: newHealth,
        isInvincible: true,
        invincibleTimer: GAME_CONFIG.PLAYER_INVINCIBLE_TIME,
      };
    });

    playPlayerHit();
    setParticles(prev => [...prev, ...createDamageEffect(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2)]);
    setScreenShake(GAME_CONFIG.MAX_SCREEN_SHAKE);
    setComboState(createComboState()); // Reset combo on damage
  }, [player]);

  // ============ Main Game Update ============
  const gameUpdate = useCallback((delta: number) => {
    if (gameStatus !== 'playing' || !player || !waveDefinition) return;

    setGameTime(prev => prev + delta);

    // ============ Player Movement ============
    const moveVec = getInputVector(input);
    const speedMult = getSpeedMultiplier(activePowerUps);
    const baseSpeed = player.ship.speed * speedMult;

    setPlayer(prev => {
      if (!prev) return null;

      let newPlayer = {
        ...prev,
        x: prev.x + moveVec.x * baseSpeed * delta,
        y: prev.y + moveVec.y * baseSpeed * delta,
        isFiring: input.fire,
      };

      // Clamp to viewport
      newPlayer = clampToViewport(newPlayer, 10) as PlayerState;

      // Update invincibility
      if (newPlayer.invincibleTimer > 0) {
        newPlayer.invincibleTimer -= delta;
        newPlayer.isInvincible = newPlayer.invincibleTimer > 0;
      }

      // Update special cooldown
      if (newPlayer.specialCooldown > 0) {
        newPlayer.specialCooldown -= delta;
      }

      // Update special timer
      if (newPlayer.isSpecialActive && newPlayer.specialTimer > 0) {
        newPlayer.specialTimer -= delta;
        if (newPlayer.specialTimer <= 0) {
          newPlayer.isSpecialActive = false;
        }
      }

      return newPlayer;
    });

    // ============ Player Firing ============
    if (input.fire && player) {
      const fireRateMult = getFireRateMultiplier(activePowerUps);
      const fireInterval = 1 / (player.ship.fireRate * fireRateMult);
      const timeSinceLastFire = gameTime - player.lastFireTime;

      if (timeSinceLastFire >= fireInterval) {
        const weapon = getActiveWeapon(activePowerUps);
        const px = player.x + PLAYER_WIDTH / 2;
        const py = player.y;

        if (weapon === 'spread' || weapon === 'basic') {
          const angles = weapon === 'spread' ? [-15, 0, 15] : [0];
          angles.forEach(angle => {
            const rad = (angle * Math.PI) / 180;
            const vx = Math.sin(rad) * GAME_CONFIG.PROJECTILE_SPEED;
            const vy = -Math.cos(rad) * GAME_CONFIG.PROJECTILE_SPEED;
            fireProjectile(px, py, vx, vy, true, player.ship.damage, weapon);
          });
        } else {
          fireProjectile(px, py, 0, -GAME_CONFIG.PROJECTILE_SPEED, true, player.ship.damage, weapon);
        }

        setPlayer(prev => prev ? { ...prev, lastFireTime: gameTime } : null);
      }
    }

    // ============ Special Ability ============
    if (input.special && player && player.specialCooldown <= 0 && !player.isSpecialActive) {
      playSpecialAbility();
      setPlayer(prev => {
        if (!prev) return null;
        return {
          ...prev,
          isSpecialActive: true,
          specialTimer: prev.ship.specialAbility.duration || 0.1,
          specialCooldown: prev.ship.specialAbility.cooldown,
        };
      });

      // Apply special effect
      const effect = player.ship.specialAbility.effect;
      if (effect === 'chain_lightning') {
        // Damage all enemies on screen
        setEnemies(prev => prev.map(e => ({
          ...e,
          health: e.health - 30,
        })));
        setParticles(prev => [...prev, ...enemies.flatMap(e =>
          createTypeExplosion(e.x + e.width / 2, e.y + e.height / 2, 'electric', 5)
        )]);
      } else if (effect === 'heal_on_kill') {
        // Activated - effect applied on kills during duration
      }
    }

    // ============ Enemy Spawning ============
    if (!boss && enemiesSpawned < getWaveEnemyCount(waveDefinition)) {
      setSpawnTimer(prev => prev + delta);

      if (spawnTimer >= waveDefinition.spawnDelay && spawnIndex < waveDefinition.enemies.length) {
        const group = waveDefinition.enemies[spawnIndex];
        if (group && enemiesSpawned < getWaveEnemyCount(waveDefinition)) {
          // Spawn from this group
          for (let i = 0; i < group.count; i++) {
            const x = 50 + Math.random() * (VIEWPORT_WIDTH - 100);
            const y = -50 - Math.random() * 50;
            spawnEnemy(group.pokemonId, group.behavior, x, y);
          }
          setSpawnIndex(prev => prev + 1);
          setSpawnTimer(0);
        }
      }
    }

    // ============ Update Enemies ============
    setEnemies(prev => prev.map(enemy => {
      let newEnemy = { ...enemy };

      // Behavior-based movement
      switch (enemy.behavior) {
        case 'diver':
          newEnemy.velocity.y = 120;
          break;
        case 'weaver':
          newEnemy.velocity.x = Math.sin(gameTime * 3 + enemy.x * 0.01) * 100;
          newEnemy.velocity.y = 80;
          break;
        case 'swooper':
          newEnemy.behaviorTimer += delta;
          if (newEnemy.behaviorTimer > 2) {
            newEnemy.velocity.y = 200;
          }
          break;
        case 'circler':
          const angle = gameTime * 2;
          newEnemy.velocity.x = Math.cos(angle) * 80;
          newEnemy.velocity.y = Math.sin(angle) * 40 + 30;
          break;
        case 'charger':
          if (player) {
            const toPlayer = getAngleToTarget(
              getEntityCenter(enemy),
              getEntityCenter(player)
            );
            newEnemy.velocity.x = Math.cos(toPlayer) * 150;
            newEnemy.velocity.y = Math.sin(toPlayer) * 150;
          }
          break;
      }

      // Apply movement
      newEnemy.x += newEnemy.velocity.x * delta;
      newEnemy.y += newEnemy.velocity.y * delta;

      // Update burn damage
      if (newEnemy.isBurning && newEnemy.burnTimer && newEnemy.burnTimer > 0) {
        newEnemy.burnTimer -= delta;
        newEnemy.health -= (newEnemy.burnDamage || 5) * delta;
      }

      // Enemy shooting
      if (enemy.fireRate > 0 && player) {
        newEnemy.lastFireTime += delta;
        if (newEnemy.lastFireTime >= 1 / enemy.fireRate) {
          const ex = enemy.x + enemy.width / 2;
          const ey = enemy.y + enemy.height;
          fireProjectile(ex, ey, 0, GAME_CONFIG.ENEMY_PROJECTILE_SPEED, false, enemy.damage, 'basic');
          newEnemy.lastFireTime = 0;
        }
      }

      return newEnemy;
    }).filter(e => !isOutOfBounds(e, 100) && e.health > 0));

    // ============ Update Boss ============
    if (boss && player) {
      const phaseIndex = getBossPhaseIndex(boss);

      // Check phase change
      if (phaseIndex !== lastBossPhase) {
        setLastBossPhase(phaseIndex);
        playBossPhaseChange();
      }

      // Boss movement
      const bossVel = updateBossMovement(boss, getEntityCenter(player), gameTime, delta);

      // Boss attacks
      setBoss(prev => {
        if (!prev) return null;

        let newBoss = {
          ...prev,
          x: Math.max(0, Math.min(VIEWPORT_WIDTH - prev.width, prev.x + bossVel.x * delta)),
          y: Math.max(60, Math.min(200, prev.y + bossVel.y * delta)),
          attackTimer: prev.attackTimer + delta,
        };

        const phase = getBossPhase(newBoss);
        const attackInterval = 0.8 / phase.attackSpeed;

        if (newBoss.attackTimer >= attackInterval) {
          // Generate attack
          const attacks = generateBossAttack(newBoss, getEntityCenter(player), gameTime);
          attacks.forEach(atk => {
            fireProjectile(atk.x, atk.y, atk.vx, atk.vy, false, atk.damage, 'basic');
          });
          newBoss.attackTimer = 0;
        }

        return newBoss;
      });

      // Boss aura particles
      if (boss) {
        const auraColor = COLORS.bossAura[boss.definition.id as keyof typeof COLORS.bossAura];
        setParticles(prev => [...prev, ...createBossAura(
          boss.x + boss.width / 2,
          boss.y + boss.height / 2,
          auraColor,
          gameTime
        )]);
      }
    }

    // ============ Update Projectiles ============
    setProjectiles(prev => prev.map(proj => ({
      ...proj,
      x: proj.x + proj.velocity.x * delta,
      y: proj.y + proj.velocity.y * delta,
    })).filter(p => !isOutOfBounds(p, 50)));

    // ============ Collision: Player Projectiles vs Enemies ============
    const playerProjectiles = projectiles.filter(p => p.isPlayerProjectile);
    const enemyProjectiles = projectiles.filter(p => !p.isPlayerProjectile);

    playerProjectiles.forEach(proj => {
      // vs Enemies
      enemies.forEach(enemy => {
        if (proj.hitEnemies.has(enemy.id)) return;
        if (checkAABBCollision(proj, enemy)) {
          playEnemyHit();
          setGameStats(prev => ({ ...prev, totalHits: prev.totalHits + 1 }));

          // Mark as hit for piercing
          proj.hitEnemies.add(enemy.id);

          // Damage enemy
          setEnemies(prevEnemies => {
            const newEnemies = prevEnemies.map(e => {
              if (e.id !== enemy.id) return e;

              const newHealth = e.health - proj.damage;

              // Apply burn from Charmander
              if (player?.isSpecialActive && player.ship.specialAbility.effect === 'burn_dot') {
                return { ...e, health: newHealth, isBurning: true, burnDamage: 10, burnTimer: 3 };
              }

              // Apply slow from Squirtle
              if (player?.isSpecialActive && player.ship.specialAbility.effect === 'slow_field') {
                return { ...e, health: newHealth, isSlowed: true, slowTimer: 2 };
              }

              return { ...e, health: newHealth };
            });

            // Check for kills
            const killed = newEnemies.filter(e => e.health <= 0);
            killed.forEach(k => {
              playEnemyDeath();

              // Update combo
              setComboState(prev => incrementCombo(prev));

              // Score
              const scoreResult = calculateEnemyKillScore(currentWave, comboState.multiplier, k.scoreValue);
              setPlayer(p => p ? { ...p, score: p.score + scoreResult.totalScore } : null);
              setGameStats(prev => ({ ...prev, totalKills: prev.totalKills + 1 }));

              // Heal on kill for Bulbasaur
              if (player?.isSpecialActive && player.ship.specialAbility.effect === 'heal_on_kill') {
                setPlayer(p => p ? { ...p, health: Math.min(p.maxHealth, p.health + 5) } : null);
                setParticles(prev => [...prev, ...createHealEffect(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2)]);
              }

              // Particles
              setParticles(prev => [...prev, ...createTypeExplosion(k.x + k.width / 2, k.y + k.height / 2, k.pokemon.types[0], 12)]);

              // Power-up drop
              if (shouldSpawnPowerUp()) {
                setPowerUps(prev => [...prev, createPowerUp(k.x + k.width / 2, k.y + k.height / 2)]);
              }
            });

            return newEnemies.filter(e => e.health > 0);
          });

          // Remove non-piercing projectile
          if (!proj.piercing) {
            setProjectiles(prev => prev.filter(p => p.id !== proj.id));
          }

          setParticles(prev => [...prev, ...createExplosion(proj.x, proj.y, '#ffaa00', 5, 0.5)]);
        }
      });

      // vs Boss
      if (boss && checkAABBCollision(proj, boss)) {
        playBossHit();
        setBoss(prev => {
          if (!prev) return null;

          const newHealth = prev.health - proj.damage;

          // Check for defeat
          if (newHealth <= 0) {
            // Check for revive (Moltres)
            if (prev.definition.revives && !prev.hasRevived) {
              playBossPhaseChange();
              return {
                ...prev,
                health: prev.maxHealth * 0.3,
                hasRevived: true,
                currentPhase: 0,
              };
            }

            playBossDefeat();
            setGameStats(prev => ({ ...prev, bossesDefeated: prev.bossesDefeated + 1 }));
            setPlayer(p => p ? { ...p, score: p.score + calculateBossDefeatScore(Math.floor(currentWave / 10)) } : null);
            setParticles(prev => [...prev, ...createTypeExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.definition.pokemon.types[0], 30)]);
            setScreenShake(15);

            setTimeout(completeWave, 2000);
            return null;
          }

          return { ...prev, health: newHealth };
        });

        setPlayer(p => p ? { ...p, score: p.score + calculateBossHitScore() } : null);
        setProjectiles(prev => prev.filter(p => p.id !== proj.id));
      }
    });

    // ============ Collision: Enemy Projectiles vs Player ============
    if (player) {
      const playerCenter = getEntityCenter(player);
      const playerRadius = PLAYER_WIDTH * 0.3; // Smaller hitbox

      enemyProjectiles.forEach(proj => {
        const projCenter = getEntityCenter(proj);
        const projRadius = proj.width * 0.5;

        // Graze check
        if (checkGraze(playerCenter, playerRadius, projCenter, projRadius, GAME_CONFIG.GRAZE_DISTANCE)) {
          playGraze();
          setPlayer(p => p ? { ...p, score: p.score + calculateGrazeScore(), grazeCount: p.grazeCount + 1 } : null);
          setGameStats(prev => ({ ...prev, totalGrazes: prev.totalGrazes + 1 }));
          setParticles(prev => [...prev, ...createGrazeEffect(proj.x, proj.y)]);
        }

        // Hit check
        if (vectorDistance(playerCenter, projCenter) < playerRadius + projRadius) {
          damagePlayer(proj.damage);
          setProjectiles(prev => prev.filter(p => p.id !== proj.id));
        }
      });

      // Collision: Enemies vs Player
      enemies.forEach(enemy => {
        if (checkAABBCollision(player, enemy)) {
          damagePlayer(enemy.damage);
        }
      });

      // Collision: Boss vs Player
      if (boss && checkAABBCollision(player, boss)) {
        damagePlayer(30);
      }
    }

    // ============ Collision: Power-ups vs Player ============
    if (player) {
      setPowerUps(prev => prev.filter(pu => {
        if (checkAABBCollision(player, pu)) {
          playPowerUp();
          const effect = applyPowerUp(player, pu);

          setPlayer(p => p ? { ...p, ...effect.player } : null);

          const duration = effect.duration;
          if (duration) {
            setActivePowerUps(prev => [...prev, {
              type: pu.type,
              timeRemaining: duration,
              totalDuration: duration,
            }]);
          }

          setGameStats(prev => ({ ...prev, powerUpsCollected: prev.powerUpsCollected + 1 }));
          setParticles(prev => [...prev, ...createExplosion(pu.x, pu.y, '#00ff00', 8, 0.8)]);
          return false;
        }

        // Move power-up down
        pu.y += GAME_CONFIG.POWERUP_FALL_SPEED * delta;
        return !isOutOfBounds(pu, 0);
      }));
    }

    // ============ Update Combo ============
    setComboState(prev => {
      const updated = updateCombo(prev, delta);

      // Check for combo milestones
      const milestone = getComboMilestone(prev.count);
      if (milestone && prev.count === milestone) {
        playComboSound(milestone);
        speakCombo(`${milestone} combo!`, milestone);
        setGameStats(prev => ({ ...prev, maxCombo: Math.max(prev.maxCombo, milestone) }));
        setParticles(prev => player ? [...prev, ...createComboEffect(player.x + PLAYER_WIDTH / 2, player.y, milestone / 10)] : prev);
      }

      return updated;
    });

    // Update player combo display
    setPlayer(prev => prev ? {
      ...prev,
      combo: comboState.count,
      comboTimer: comboState.timer,
      comboMultiplier: comboState.multiplier,
    } : null);

    // ============ Update Active Power-ups ============
    setActivePowerUps(prev => updateActivePowerUps(prev, delta));

    // ============ Update Particles ============
    setParticles(prev => updateParticles(prev, delta));

    // Add thruster particles
    if (player && (input.up || input.down || input.left || input.right)) {
      setParticles(prev => [...prev, ...createThrusterFlame(
        player.x + PLAYER_WIDTH / 2,
        player.y + PLAYER_HEIGHT,
        player.velocity
      )]);
    }

    // ============ Update Star Field ============
    setStarField(prev => prev.map(star => {
      let newStar = { ...star, y: star.y + star.vy * delta };
      if (newStar.y > VIEWPORT_HEIGHT) {
        newStar.y = -10;
        newStar.x = Math.random() * VIEWPORT_WIDTH;
      }
      return newStar;
    }));

    // ============ Screen Shake Decay ============
    setScreenShake(prev => prev * GAME_CONFIG.SCREEN_SHAKE_DECAY);

    // ============ Check Wave Complete ============
    if (!boss && enemies.length === 0 && enemiesSpawned >= getWaveEnemyCount(waveDefinition)) {
      completeWave();
    }

  }, [
    gameStatus, player, waveDefinition, enemies, projectiles, powerUps, boss,
    currentWave, enemiesSpawned, spawnTimer, spawnIndex, comboState, activePowerUps,
    gameTime, lastBossPhase, input, fireProjectile, spawnEnemy, damagePlayer, completeWave
  ]);

  // Run game loop
  useFixedGameLoop(gameUpdate, gameStatus === 'playing');

  // Focus game on mount
  useEffect(() => {
    gameRef.current?.focus();
  }, [gameStatus]);

  // ============ Render ============
  const shakeOffset = getScreenShakeOffset(screenShake);

  return (
    <div
      ref={gameRef}
      className="outline-none relative"
      tabIndex={0}
      style={{
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
        }}
      >
        <StarField particles={starField} />
      </div>

      {/* Menu */}
      {gameStatus === 'menu' && (
        <Menu
          onStartGame={startGame}
          onBack={onBack}
        />
      )}

      {/* Wave Announcer */}
      {gameStatus === 'waveIntro' && waveDefinition && (
        <WaveAnnouncer
          wave={waveDefinition}
          onComplete={startWave}
          playerName={playerName}
        />
      )}

      {/* Boss Intro */}
      {gameStatus === 'bossIntro' && waveDefinition?.bossId && (
        <BossIntro
          boss={waveDefinition.bossId ? (createBoss(waveDefinition.bossId)?.definition || null as any) : null}
          onComplete={startBoss}
        />
      )}

      {/* Game World */}
      {(gameStatus === 'playing' || gameStatus === 'paused') && player && (
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
          }}
        >
          {/* Particles (behind everything) */}
          <Particles particles={particles} />

          {/* Power-ups */}
          {powerUps.map(pu => (
            <div
              key={pu.id}
              className="absolute animate-bounce"
              style={{
                left: pu.x - pu.width / 2,
                top: pu.y - pu.height / 2,
                fontSize: '28px',
              }}
            >
              {pu.type === 'health' ? '❤️' :
               pu.type === 'spread' ? '🔥' :
               pu.type === 'laser' ? '⚡' :
               pu.type === 'homing' ? '🎯' :
               pu.type === 'piercing' ? '💠' :
               pu.type === 'shield' ? '🛡️' :
               pu.type === 'speed' ? '💨' :
               '🔫'}
            </div>
          ))}

          {/* Enemies */}
          {enemies.map(enemy => (
            <div
              key={enemy.id}
              className="absolute"
              style={{
                left: enemy.x,
                top: enemy.y,
                filter: enemy.isBurning ? 'brightness(1.5) hue-rotate(30deg)' :
                        enemy.isSlowed ? 'brightness(0.7) hue-rotate(-30deg)' : 'none',
              }}
            >
              <Image
                src={enemy.pokemon.image}
                alt={enemy.pokemon.name}
                width={Math.floor(enemy.width)}
                height={Math.floor(enemy.height)}
              />
              {/* Health bar for tough enemies */}
              {enemy.health < enemy.maxHealth && (
                <div className="absolute -top-2 left-0 w-full h-1 bg-gray-800 rounded-full">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Boss */}
          {boss && (
            <div
              className="absolute"
              style={{
                left: boss.x,
                top: boss.y,
              }}
            >
              <Image
                src={boss.definition.pokemon.image}
                alt={boss.definition.name}
                width={boss.width}
                height={boss.height}
                className="drop-shadow-2xl"
                style={{
                  filter: `drop-shadow(0 0 20px ${COLORS.bossAura[boss.definition.id as keyof typeof COLORS.bossAura]})`,
                }}
              />
            </div>
          )}

          {/* Projectiles */}
          {projectiles.map(proj => (
            <div
              key={proj.id}
              className="absolute"
              style={{
                left: proj.x - proj.width / 2,
                top: proj.y - proj.height / 2,
                width: proj.width,
                height: proj.height,
                backgroundColor: proj.isPlayerProjectile ? '#00ff00' : '#ff4444',
                borderRadius: proj.isPlayerProjectile ? '2px' : '50%',
                boxShadow: `0 0 10px ${proj.isPlayerProjectile ? '#00ff00' : '#ff4444'}`,
              }}
            />
          ))}

          {/* Player */}
          <div
            className="absolute transition-opacity"
            style={{
              left: player.x,
              top: player.y,
              opacity: player.isInvincible && Math.floor(gameTime * 10) % 2 ? 0.3 : 1,
            }}
          >
            <Image
              src={player.ship.pokemon.image}
              alt={player.ship.name}
              width={PLAYER_WIDTH}
              height={PLAYER_HEIGHT}
              className="drop-shadow-lg"
            />
            {/* Shield effect */}
            {player.isInvincible && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  border: `3px solid ${player.ship.color}`,
                  boxShadow: `0 0 20px ${player.ship.color}`,
                }}
              />
            )}
            {/* Special active indicator */}
            {player.isSpecialActive && (
              <div
                className="absolute -inset-2 rounded-full animate-spin"
                style={{
                  border: `2px dashed ${player.ship.color}`,
                }}
              />
            )}
          </div>

          {/* HUD */}
          <HUD
            player={player}
            currentWave={currentWave}
            waveName={waveDefinition?.name}
            boss={boss}
            highScore={gameStats.totalScore}
          />
        </div>
      )}

      {/* Game Over */}
      {(gameStatus === 'gameOver' || gameStatus === 'victory') && selectedShip && (
        <GameOver
          isVictory={gameStatus === 'victory'}
          stats={gameStats}
          ship={selectedShip}
          playerName={playerName}
          onPlayAgain={() => startGame(selectedShip)}
          onMainMenu={() => setGameStatus('menu')}
        />
      )}
    </div>
  );
}
