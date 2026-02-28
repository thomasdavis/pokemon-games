// Pokemon Starblast - Main Menu & Ship Selection

import React, { useState } from 'react';
import Image from 'next/image';
import { PlayerShip, PlayerShipId } from '../types';
import { PLAYER_SHIPS } from '../utils/constants';
import { formatScore, getHighScore } from '../utils/scoring';
import { playMenuClick, playMenuHover, playMenuSelect } from '../lib/soundLayers';

interface MenuProps {
  onStartGame: (ship: PlayerShip) => void;
  onBack: () => void;
}

export default function Menu({ onStartGame, onBack }: MenuProps) {
  const [selectedShip, setSelectedShip] = useState<PlayerShipId | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const highScore = getHighScore();

  const ships = Object.values(PLAYER_SHIPS);

  const handleShipSelect = (shipId: PlayerShipId) => {
    playMenuClick();
    setSelectedShip(shipId);
  };

  const handleStartGame = () => {
    if (selectedShip) {
      playMenuSelect();
      onStartGame(PLAYER_SHIPS[selectedShip]);
    }
  };

  const handleBack = () => {
    playMenuClick();
    onBack();
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-purple-900/50 to-gray-900 flex items-center justify-center">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500 mb-2">
          Pokemon Starblast
        </h1>
        <p className="text-gray-400 text-lg mb-2">Epic Space Shooter Adventure</p>

        {/* High Score */}
        {highScore > 0 && (
          <div className="text-yellow-400 font-bold mb-4">
            High Score: {formatScore(highScore)}
          </div>
        )}

        {showInstructions ? (
          /* Instructions Panel */
          <div className="bg-gray-800/90 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">How to Play</h2>
            <div className="grid grid-cols-2 gap-4 text-left text-gray-300">
              <div>
                <h3 className="text-yellow-400 font-bold mb-2">Controls</h3>
                <ul className="space-y-1 text-sm">
                  <li>⬅️⬆️⬇️➡️ Arrow Keys: Move</li>
                  <li>Space (hold): Fire weapon</li>
                  <li>Shift: Special ability</li>
                </ul>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-2">Tips</h3>
                <ul className="space-y-1 text-sm">
                  <li>Build combos by killing fast!</li>
                  <li>Graze bullets for bonus points</li>
                  <li>Collect power-ups to upgrade</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-4 text-gray-400 hover:text-white transition-colors"
            >
              ← Back to ship selection
            </button>
          </div>
        ) : (
          <>
            {/* Ship Selection */}
            <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Choose Your Ship</h2>

              <div className="flex flex-wrap justify-center gap-4 mb-4">
                {ships.map((ship) => (
                  <button
                    key={ship.id}
                    onClick={() => handleShipSelect(ship.id)}
                    onMouseEnter={() => playMenuHover()}
                    className={`p-3 rounded-xl transition-all ${
                      selectedShip === ship.id
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500 scale-110 shadow-lg'
                        : 'bg-gray-700/50 hover:bg-gray-600/50 hover:scale-105'
                    }`}
                    style={{
                      borderColor: ship.color,
                      borderWidth: selectedShip === ship.id ? 3 : 0,
                    }}
                  >
                    <Image
                      src={ship.pokemon.image}
                      alt={ship.name}
                      width={64}
                      height={64}
                      className="mx-auto"
                    />
                    <div className="text-white font-bold text-sm mt-1">{ship.name}</div>
                  </button>
                ))}
              </div>

              {/* Selected Ship Details */}
              {selectedShip && (
                <div className="bg-gray-900/50 rounded-xl p-4 text-left">
                  <div className="flex items-start gap-4">
                    <Image
                      src={PLAYER_SHIPS[selectedShip].pokemon.image}
                      alt={PLAYER_SHIPS[selectedShip].name}
                      width={80}
                      height={80}
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">
                        {PLAYER_SHIPS[selectedShip].name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-2">
                        {PLAYER_SHIPS[selectedShip].description}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">❤️</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-red-400 h-full rounded-full"
                              style={{ width: `${(PLAYER_SHIPS[selectedShip].health / 140) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400">💨</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-400 h-full rounded-full"
                              style={{ width: `${(PLAYER_SHIPS[selectedShip].speed / 400) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">⚔️</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-full rounded-full"
                              style={{ width: `${(PLAYER_SHIPS[selectedShip].damage / 14) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">🔫</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-400 h-full rounded-full"
                              style={{ width: `${(PLAYER_SHIPS[selectedShip].fireRate / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Special Ability */}
                      <div className="mt-2 text-sm">
                        <span className="text-purple-400 font-bold">
                          ⚡ {PLAYER_SHIPS[selectedShip].specialAbility.name}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {PLAYER_SHIPS[selectedShip].specialAbility.description}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={!selectedShip}
              className={`w-full py-4 px-8 rounded-xl font-bold text-xl transition-all ${
                selectedShip
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-lg hover:shadow-green-500/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedShip ? '🚀 START GAME' : 'Select a Ship'}
            </button>
          </>
        )}

        {/* Bottom links */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            📖 How to Play
          </button>
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Games
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
