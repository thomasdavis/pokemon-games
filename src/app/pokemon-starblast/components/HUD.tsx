// Pokemon Starblast - Heads Up Display

import React from 'react';
import { PlayerState, BossState } from '../types';
import { formatScore, formatComboMultiplier } from '../utils/scoring';
import { COLORS } from '../utils/constants';

interface HUDProps {
  player: PlayerState;
  currentWave: number;
  waveName?: string;
  boss?: BossState | null;
  highScore: number;
}

export default function HUD({
  player,
  currentWave,
  waveName,
  boss,
  highScore,
}: HUDProps) {
  const healthPercent = (player.health / player.maxHealth) * 100;
  const specialPercent = player.specialCooldown > 0
    ? 0
    : 100;
  const comboActive = player.combo > 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top HUD Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        {/* Left: Health & Special */}
        <div className="space-y-2">
          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">❤️</span>
            <div className="w-32 h-4 bg-gray-800/80 rounded-full overflow-hidden border border-red-900">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${healthPercent}%`,
                  backgroundColor: healthPercent > 50 ? COLORS.health :
                    healthPercent > 25 ? '#f59e0b' : '#dc2626',
                }}
              />
            </div>
            <span className="text-white font-bold text-sm">
              {player.health}/{player.maxHealth}
            </span>
          </div>

          {/* Special Ability */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div className="w-32 h-3 bg-gray-800/80 rounded-full overflow-hidden border border-purple-900">
              <div
                className={`h-full transition-all duration-200 ${
                  player.specialCooldown <= 0 ? 'animate-pulse' : ''
                }`}
                style={{
                  width: player.specialCooldown <= 0 ? '100%' :
                    `${(1 - player.specialCooldown / player.ship.specialAbility.cooldown) * 100}%`,
                  backgroundColor: player.specialCooldown <= 0 ? COLORS.specialReady : COLORS.special,
                }}
              />
            </div>
            <span className={`text-sm font-bold ${
              player.specialCooldown <= 0 ? 'text-green-400' : 'text-gray-400'
            }`}>
              {player.specialCooldown <= 0 ? 'READY!' : Math.ceil(player.specialCooldown) + 's'}
            </span>
          </div>
        </div>

        {/* Center: Wave Info */}
        <div className="text-center">
          <div className="bg-black/50 backdrop-blur rounded-xl px-4 py-2">
            <div className="text-white font-bold text-lg">
              Wave {currentWave}
            </div>
            {waveName && (
              <div className="text-gray-300 text-sm">{waveName}</div>
            )}
          </div>
        </div>

        {/* Right: Score */}
        <div className="text-right space-y-1">
          <div className="bg-black/50 backdrop-blur rounded-xl px-4 py-2">
            <div className="text-yellow-400 font-bold text-2xl">
              {formatScore(player.score)}
            </div>
            <div className="text-gray-400 text-xs">
              HI: {formatScore(highScore)}
            </div>
          </div>
        </div>
      </div>

      {/* Combo Display (Center-ish, below wave) */}
      {comboActive && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2">
          <div
            className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur rounded-xl px-6 py-2 animate-pulse"
            style={{
              transform: `scale(${1 + Math.min(0.3, player.combo * 0.01)})`,
            }}
          >
            <div className="text-white font-bold text-center">
              <span className="text-3xl">{player.combo}</span>
              <span className="text-lg ml-1">COMBO</span>
            </div>
            <div className="text-yellow-300 font-bold text-center text-lg">
              {formatComboMultiplier(player.comboMultiplier)}
            </div>
          </div>
          {/* Combo timer bar */}
          <div className="w-full h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
              style={{
                width: `${(player.comboTimer / 3) * 100}%`, // 3 second timeout
              }}
            />
          </div>
        </div>
      )}

      {/* Boss Health Bar */}
      {boss && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-2/3 max-w-md">
          <div className="bg-black/70 backdrop-blur rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-red-400 font-bold text-lg">
                {boss.definition.name}
              </span>
              <span className="text-gray-400 text-sm">
                Phase {boss.currentPhase + 1}
              </span>
            </div>
            <div className="w-full h-5 bg-gray-900 rounded-full overflow-hidden border-2 border-red-800">
              <div
                className="h-full transition-all duration-300 bg-gradient-to-r from-red-600 to-red-400"
                style={{
                  width: `${(boss.health / boss.maxHealth) * 100}%`,
                }}
              />
            </div>
            {/* Phase markers */}
            <div className="relative w-full h-1 mt-1">
              {boss.definition.phases.map((phase, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-full bg-yellow-400"
                  style={{
                    left: `${phase.healthThreshold * 100}%`,
                    opacity: boss.currentPhase >= i ? 0.3 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Controls Hint (fades after a few seconds) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/40 backdrop-blur rounded-full px-4 py-2 text-white/60 text-sm">
          ⬅️⬆️⬇️➡️ Move | Space: Fire | Shift: Special
        </div>
      </div>

      {/* Weapon indicator */}
      {player.weapon !== 'basic' && (
        <div className="absolute bottom-16 left-4">
          <div className="bg-blue-500/80 backdrop-blur rounded-xl px-3 py-1">
            <span className="text-white font-bold text-sm uppercase">
              {player.weapon}
            </span>
          </div>
        </div>
      )}

      {/* Invincibility indicator */}
      {player.isInvincible && !player.specialCooldown && (
        <div className="absolute bottom-16 right-4">
          <div className="bg-yellow-500/80 backdrop-blur rounded-xl px-3 py-1 animate-pulse">
            <span className="text-white font-bold text-sm">
              🛡️ SHIELD
            </span>
          </div>
        </div>
      )}

      {/* Graze counter */}
      {player.grazeCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 mt-16">
          <div className="text-green-400 font-bold text-sm">
            Graze: {player.grazeCount} (+{player.grazeCount * 50})
          </div>
        </div>
      )}
    </div>
  );
}

// Mini HUD for game over screen stats
export function StatsDisplay({
  score,
  wave,
  kills,
  maxCombo,
  accuracy,
  bossesDefeated,
}: {
  score: number;
  wave: number;
  kills: number;
  maxCombo: number;
  accuracy: number;
  bossesDefeated: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 text-left">
      <div>
        <div className="text-gray-400 text-sm">Final Score</div>
        <div className="text-yellow-400 font-bold text-2xl">{formatScore(score)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Wave Reached</div>
        <div className="text-white font-bold text-2xl">{wave}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Enemies Defeated</div>
        <div className="text-red-400 font-bold text-xl">{kills}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Max Combo</div>
        <div className="text-purple-400 font-bold text-xl">{maxCombo}x</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Accuracy</div>
        <div className="text-blue-400 font-bold text-xl">{accuracy.toFixed(1)}%</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Bosses Defeated</div>
        <div className="text-orange-400 font-bold text-xl">{bossesDefeated}</div>
      </div>
    </div>
  );
}
