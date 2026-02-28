// Pokemon Starblast - Game Over & Victory Screens

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { PlayerShip } from '../types';
import { GameStats, formatScore, saveHighScore, getHighScore } from '../utils/scoring';
import { speakVictory, speakDefeat } from '../lib/speechDrama';
import { playVictoryFanfare, playGameOver } from '../lib/soundLayers';
import { useAI } from '../hooks/useAI';

interface GameOverProps {
  isVictory: boolean;
  stats: GameStats;
  ship: PlayerShip;
  playerName: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export default function GameOver({
  isVictory,
  stats,
  ship,
  playerName,
  onPlayAgain,
  onMainMenu,
}: GameOverProps) {
  const [message, setMessage] = useState<string>('');
  const [subMessage, setSubMessage] = useState<string>('');
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [phase, setPhase] = useState<'entering' | 'showing' | 'stats'>('entering');
  const { getVictoryMessage, getDefeatMessage } = useAI();

  useEffect(() => {
    let mounted = true;

    // Check for high score
    const newHigh = saveHighScore(stats.totalScore);
    setIsNewHighScore(newHigh);

    // Play sound
    if (isVictory) {
      playVictoryFanfare();
    } else {
      playGameOver();
    }

    // Load AI message
    const loadMessage = async () => {
      try {
        if (isVictory) {
          const result = await getVictoryMessage(
            playerName,
            stats.wavesCompleted,
            stats.totalScore,
            stats.bossesDefeated
          );
          if (mounted) {
            setMessage(result.celebration);
            setSubMessage(result.stats);
            // Speak it
            speakVictory(result.celebration, result.stats);
          }
        } else {
          const result = await getDefeatMessage(
            playerName,
            stats.wavesCompleted,
            null
          );
          if (mounted) {
            setMessage(result.encouragement);
            setSubMessage(result.tip);
            // Speak it
            speakDefeat(result.encouragement, result.tip);
          }
        }
      } catch {
        if (mounted) {
          if (isVictory) {
            setMessage(`Amazing job, ${playerName}! You're a Pokemon space champion!`);
            setSubMessage(`${stats.wavesCompleted} waves conquered!`);
          } else {
            setMessage(`Great effort, ${playerName}! You made it to wave ${stats.wavesCompleted}!`);
            setSubMessage('Keep practicing and you will go further!');
          }
        }
      }
    };

    loadMessage();

    // Animation phases
    setTimeout(() => {
      if (mounted) setPhase('showing');
    }, 100);

    setTimeout(() => {
      if (mounted) setPhase('stats');
    }, 2000);

    return () => {
      mounted = false;
    };
  }, [isVictory, stats, playerName, getVictoryMessage, getDefeatMessage]);

  const accuracy = stats.totalShots > 0
    ? (stats.totalHits / stats.totalShots) * 100
    : 0;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-50 transition-all duration-500 ${
        phase === 'entering' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: isVictory
          ? 'linear-gradient(to bottom, rgba(34, 197, 94, 0.3), rgba(0, 0, 0, 0.9))'
          : 'linear-gradient(to bottom, rgba(239, 68, 68, 0.3), rgba(0, 0, 0, 0.9))',
      }}
    >
      {/* Decorative particles */}
      {isVictory && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}

      <div
        className={`relative max-w-lg w-full mx-4 transform transition-all duration-700 ${
          phase === 'entering' ? 'scale-50 translate-y-20' : 'scale-100 translate-y-0'
        }`}
      >
        {/* Main card */}
        <div
          className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border-2"
          style={{
            borderColor: isVictory ? '#22c55e' : '#ef4444',
            boxShadow: `0 0 60px ${isVictory ? '#22c55e40' : '#ef444440'}`,
          }}
        >
          {/* Title */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">
              {isVictory ? '🏆' : '💀'}
            </div>
            <h1
              className={`text-4xl font-bold ${
                isVictory ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isVictory ? 'VICTORY!' : 'GAME OVER'}
            </h1>

            {isNewHighScore && (
              <div className="mt-2 text-yellow-400 font-bold text-xl animate-pulse">
                🎉 NEW HIGH SCORE! 🎉
              </div>
            )}
          </div>

          {/* Ship and score */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image
              src={ship.pokemon.image}
              alt={ship.name}
              width={64}
              height={64}
            />
            <div className="text-center">
              <div className="text-gray-400 text-sm">{playerName}'s Score</div>
              <div className="text-yellow-400 font-bold text-3xl">
                {formatScore(stats.totalScore)}
              </div>
              {!isNewHighScore && (
                <div className="text-gray-500 text-xs">
                  High Score: {formatScore(getHighScore())}
                </div>
              )}
            </div>
          </div>

          {/* AI Message */}
          {message && (
            <div className="text-center mb-6">
              <p className="text-white text-lg">{message}</p>
              {subMessage && (
                <p className="text-gray-400 mt-2">{subMessage}</p>
              )}
            </div>
          )}

          {/* Stats */}
          {phase === 'stats' && (
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Waves</div>
                <div className="text-white font-bold text-xl">{stats.wavesCompleted}</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Enemies</div>
                <div className="text-red-400 font-bold text-xl">{stats.totalKills}</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Max Combo</div>
                <div className="text-purple-400 font-bold text-xl">{stats.maxCombo}x</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Accuracy</div>
                <div className="text-blue-400 font-bold text-xl">{accuracy.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Bosses</div>
                <div className="text-orange-400 font-bold text-xl">{stats.bossesDefeated}</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="text-gray-400 text-xs">Grazes</div>
                <div className="text-green-400 font-bold text-xl">{stats.totalGrazes}</div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onPlayAgain}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-lg transition-all ${
                isVictory
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400'
              } text-white shadow-lg hover:scale-105`}
            >
              Play Again
            </button>
            <button
              onClick={onMainMenu}
              className="flex-1 py-3 px-6 rounded-xl font-bold text-lg bg-gray-700 text-white hover:bg-gray-600 transition-all hover:scale-105"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.5; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
