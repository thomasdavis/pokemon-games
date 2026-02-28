'use client';

/**
 * PokéSense - An AI-Powered Pokemon Learning Adventure
 *
 * A comprehensive game that combines:
 * - AI-generated contextual dialogue for every interaction
 * - Type-themed dynamic backgrounds with particle effects
 * - Gentle motor skill challenges for kids
 * - Persistent progress with localStorage
 * - Rich Pokemon information and facts
 * - Always-visible Pokedex on the left
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { usePlayer } from '@/lib/player';
import { playSound } from '@/lib/sounds';
import { useGameEngine } from './hooks/useGameEngine';
import { getBackgroundForType, generateParticles, Particle } from './lib/backgrounds';
import { loadCaughtPokemon, loadStats, loadSettings } from './lib/storage';
import { SkillChallengeWrapper } from './components/SkillChallenges';
import { PokemonDetails } from './components/PokemonDetails';
import { ParticleSystem } from './components/ParticleSystem';
import { CelebrationEffects, AchievementPopup } from './components/CelebrationEffects';
import { typeColors } from '@/data/pokemon';

export default function PokeSensePage() {
  const { name: playerName } = usePlayer();
  const [state, actions] = useGameEngine(playerName);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAchievement, setShowAchievement] = useState<{
    name: string;
    description: string;
    icon: string;
  } | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);

  const { session, isLoading, isSpeaking, currentDialogue, newAchievements, sessionCatchCount } = state;
  const { startGame, startNewEncounter, completeSkillChallenge, updateSkillProgress, advancePhase } = actions;

  // Get background based on current Pokemon
  const background = session.currentPokemon
    ? getBackgroundForType(session.currentPokemon.types[0])
    : getBackgroundForType('Normal');

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gameRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Show achievements one at a time
  useEffect(() => {
    if (newAchievements.length > 0 && !showAchievement) {
      const achievement = newAchievements[0];
      setShowAchievement({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
      });
    }
  }, [newAchievements, showAchievement]);

  // Load initial stats
  const [totalCaught, setTotalCaught] = useState(0);
  useEffect(() => {
    setTotalCaught(loadCaughtPokemon().length);
  }, [session.caughtPokemon]);

  // Celebration intensity based on Pokemon
  const getCelebrationIntensity = () => {
    if (!session.currentPokemon) return 'normal';
    if (session.currentPokemon.is_legendary) return 'legendary';
    if (session.currentPokemon.is_mythical) return 'mythical';
    return 'normal';
  };

  // Check if we should show the Pokedex sidebar
  const showPokedex = session.currentPokemon && session.phase !== 'title' && session.phase !== 'summary';

  return (
    <div
      ref={gameRef}
      className={`relative w-full h-full bg-gradient-to-br ${background.gradient} overflow-hidden transition-all duration-1000`}
    >
      {/* Particle System */}
      <ParticleSystem theme={background} enabled={loadSettings().showParticles} />

      {/* Ambient overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: background.ambientColor }}
      />

      {/* Celebration Effects */}
      <CelebrationEffects
        active={session.phase === 'catching' || session.phase === 'caught'}
        intensity={getCelebrationIntensity()}
      />

      {/* Achievement Popup */}
      <AchievementPopup
        achievement={showAchievement}
        onDismiss={() => setShowAchievement(null)}
      />

      {/* Header HUD */}
      <div className="relative z-20 flex justify-between items-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-full px-6 py-3 shadow-xl">
          <span className="text-xl font-bold text-gray-800">
            🎮 PokéSense
          </span>
          <span className="text-gray-600 ml-2">
            {playerName}&apos;s Adventure
          </span>
        </div>

        <div className="flex gap-3">
          {/* Streak indicator */}
          {session.streak > 0 && (
            <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full px-4 py-2 shadow-xl animate-pulse">
              <span className="font-bold">🔥 {session.streak} Streak!</span>
            </div>
          )}

          {/* Caught counter */}
          <div className="bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-xl">
            <span className="text-lg font-bold text-purple-600">
              Caught: {totalCaught}
            </span>
          </div>

          {/* Session catches */}
          {sessionCatchCount > 0 && (
            <div className="bg-green-500 text-white rounded-full px-4 py-2 shadow-xl">
              <span className="font-bold">+{sessionCatchCount} today</span>
            </div>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-xl hover:scale-105 transition-transform"
          >
            {isFullscreen ? '⬇️ Exit' : '⬆️ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main Game Layout - Two Column when Pokemon is active */}
      <div className={`relative z-10 flex ${showPokedex ? 'flex-row' : 'flex-col flex-1'} px-4 pb-4 gap-4`}>
        {/* LEFT SIDEBAR - Pokedex Device */}
        {showPokedex && (
          <div className="w-[320px] flex-shrink-0 animate-fade-in h-[500px]">
            <PokemonDetails
              pokemon={session.currentPokemon!}
              onContinue={advancePhase}
              factIndex={0}
              totalFacts={5}
            />
          </div>
        )}

        {/* RIGHT SIDE - Main Game Area */}
        <div className={`flex-1 flex flex-col items-center justify-center ${showPokedex ? 'overflow-auto' : ''}`}>
          {/* Title Screen */}
          {session.phase === 'title' && (
            <div className="text-center animate-fade-in">
              <h1 className="text-7xl font-bold text-white drop-shadow-lg mb-6">
                🎯 PokéSense 🎯
              </h1>
              <p className="text-2xl text-white/90 mb-4">
                Welcome, {playerName}!
              </p>
              <p className="text-xl text-white/80 mb-8 max-w-lg mx-auto">
                Catch Pokémon, learn about types, and become a Pokémon Master!
              </p>

              {/* Stats preview */}
              {totalCaught > 0 && (
                <div className="bg-white/20 backdrop-blur rounded-2xl p-6 mb-8 inline-block">
                  <p className="text-white text-lg">
                    You&apos;ve caught <strong className="text-2xl">{totalCaught}</strong> Pokémon so far!
                  </p>
                </div>
              )}

              <button
                onClick={startGame}
                disabled={isLoading}
                className="bg-white text-purple-600 text-3xl font-bold px-12 py-6 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform animate-bounce-slow disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : totalCaught > 0 ? 'Continue Adventure!' : 'Start Adventure!'} 🚀
              </button>
            </div>
          )}

          {/* Pokemon Encounter / Introduction */}
          {(session.phase === 'encounter' || session.phase === 'introduction') && session.currentPokemon && (
            <div className="text-center animate-fade-in">
              {/* Pokemon Image */}
              <div className="relative inline-block mb-6">
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-50 animate-pulse"
                  style={{
                    backgroundColor: typeColors[session.currentPokemon.types[0]] || '#888',
                    transform: 'scale(1.2)',
                  }}
                />
                <div className="relative bg-white/30 backdrop-blur-sm rounded-full p-8 shadow-2xl">
                  <Image
                    src={`/pokemon/${session.currentPokemon.id}.png`}
                    alt={session.currentPokemon.name}
                    width={220}
                    height={220}
                    className="drop-shadow-2xl animate-bounce-slow"
                  />
                </div>

                {/* Type badges */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-2">
                  {session.currentPokemon.types.map(type => (
                    <span
                      key={type}
                      className="px-4 py-1 rounded-full text-white text-sm font-bold shadow-lg"
                      style={{ backgroundColor: typeColors[type] || '#888' }}
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {/* Legendary/Mythical badge */}
                {session.currentPokemon.is_legendary && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                    ⭐ LEGENDARY ⭐
                  </div>
                )}
                {session.currentPokemon.is_mythical && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                    ✨ MYTHICAL ✨
                  </div>
                )}
              </div>

              {/* Pokemon name */}
              <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-4">
                {session.currentPokemon.name}
              </h2>

              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="mt-6 bg-white/90 backdrop-blur rounded-2xl px-8 py-4 shadow-xl max-w-xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-lg text-gray-800">{currentDialogue}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skill Challenge Phases */}
          {(session.phase === 'skill_briefing' || session.phase === 'skill_active') &&
            session.currentPokemon &&
            session.currentSkill && (
            <div className="w-full max-w-3xl animate-fade-in">
              {/* Skill name */}
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                  {session.currentSkill.type === 'aim' && '🎯 Poké Ball Aim'}
                  {session.currentSkill.type === 'track' && '👆 Follow the Pokémon'}
                  {session.currentSkill.type === 'dodge' && '🎪 Catch the Right One'}
                  {session.currentSkill.type === 'typematch' && '🧠 Type Match'}
                </h2>
              </div>

              {/* Speaking indicator during briefing */}
              {session.phase === 'skill_briefing' && isSpeaking && (
                <div className="mb-4 bg-white/90 backdrop-blur rounded-2xl px-6 py-3 shadow-xl max-w-xl mx-auto">
                  <p className="text-lg text-gray-800 text-center">{currentDialogue}</p>
                </div>
              )}

              {/* Skill challenge component */}
              {session.phase === 'skill_active' && (
                <div className="bg-white/20 backdrop-blur rounded-3xl p-4 shadow-2xl">
                  <SkillChallengeWrapper
                    pokemon={session.currentPokemon}
                    skillType={session.currentSkill.type}
                    difficulty={session.difficulty}
                    isActive={session.currentSkill.isActive}
                    onSuccess={() => completeSkillChallenge(true)}
                    onFailure={() => completeSkillChallenge(false)}
                    onProgress={updateSkillProgress}
                  />
                </div>
              )}

              {/* Encouragement during active challenge */}
              {session.phase === 'skill_active' && isSpeaking && (
                <div className="mt-3 bg-yellow-100 rounded-xl px-4 py-2 shadow-lg max-w-lg mx-auto">
                  <p className="text-base text-yellow-800 text-center font-medium">
                    💡 {currentDialogue}
                  </p>
                </div>
              )}

              {/* Attempt counter */}
              {session.currentSkill.attempts > 0 && (
                <div className="text-center mt-3">
                  <span className="bg-white/80 px-4 py-2 rounded-full text-gray-700 font-medium">
                    Attempt {session.currentSkill.attempts + 1}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Success / Catching Phase */}
          {(session.phase === 'skill_success' || session.phase === 'catching' || session.phase === 'caught') &&
            session.currentPokemon && (
            <div className="text-center animate-fade-in">
              <div className="relative inline-block mb-6">
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-70 animate-pulse"
                  style={{
                    backgroundColor: session.currentPokemon.is_legendary
                      ? '#FFD700'
                      : session.currentPokemon.is_mythical
                      ? '#9333ea'
                      : '#4ade80',
                    transform: 'scale(1.5)',
                  }}
                />
                <div className="relative bg-white/40 backdrop-blur-sm rounded-full p-6 shadow-2xl animate-bounce">
                  <Image
                    src={`/pokemon/${session.currentPokemon.id}.png`}
                    alt={session.currentPokemon.name}
                    width={180}
                    height={180}
                    className="drop-shadow-2xl"
                  />
                </div>
              </div>

              <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-4">
                🎉 Gotcha! 🎉
              </h2>
              <p className="text-xl text-white/90 mb-4">
                {session.currentPokemon.name} was caught!
              </p>

              {/* Speaking */}
              {isSpeaking && (
                <div className="mt-4 bg-white/90 backdrop-blur rounded-2xl px-6 py-3 shadow-xl max-w-xl mx-auto">
                  <p className="text-lg text-gray-800">{currentDialogue}</p>
                </div>
              )}
            </div>
          )}

          {/* Details Phase - Now just shows a "Next Pokemon" button since Pokedex is always visible */}
          {session.phase === 'details' && session.currentPokemon && (
            <div className="text-center animate-fade-in">
              {/* Speaking fact */}
              {isSpeaking && (
                <div className="mb-6 bg-yellow-100 rounded-xl px-6 py-4 shadow-lg max-w-xl mx-auto">
                  <p className="text-lg text-yellow-800">
                    💡 {currentDialogue}
                  </p>
                </div>
              )}

              <div className="bg-white/30 backdrop-blur rounded-full p-8 shadow-2xl inline-block mb-6">
                <Image
                  src={`/pokemon/${session.currentPokemon.id}.png`}
                  alt={session.currentPokemon.name}
                  width={180}
                  height={180}
                  className="drop-shadow-2xl"
                />
              </div>

              <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">
                {session.currentPokemon.name} added to your collection!
              </h2>

              <button
                onClick={startNewEncounter}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-2xl font-bold px-12 py-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-transform mt-4"
              >
                Find More Pokémon! 🔍
              </button>
            </div>
          )}

          {/* Summary Phase */}
          {session.phase === 'summary' && (
            <div className="text-center animate-fade-in">
              <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto">
                <h2 className="text-4xl font-bold text-green-600 mb-6">
                  🎉 Incredible Adventure! 🎉
                </h2>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-purple-100 rounded-xl p-4">
                    <p className="text-sm text-purple-600 font-medium">This Session</p>
                    <p className="text-3xl font-bold text-purple-700">{sessionCatchCount}</p>
                  </div>
                  <div className="bg-blue-100 rounded-xl p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Caught</p>
                    <p className="text-3xl font-bold text-blue-700">{totalCaught}</p>
                  </div>
                  <div className="bg-orange-100 rounded-xl p-4">
                    <p className="text-sm text-orange-600 font-medium">Best Streak</p>
                    <p className="text-3xl font-bold text-orange-700">{session.streak}</p>
                  </div>
                  <div className="bg-green-100 rounded-xl p-4">
                    <p className="text-sm text-green-600 font-medium">Progress</p>
                    <p className="text-3xl font-bold text-green-700">
                      {Math.floor((totalCaught / 1008) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Recent catches */}
                {session.caughtPokemon.length > 0 && (
                  <div className="mb-6">
                    <p className="text-gray-600 mb-3">Recent catches:</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {session.caughtPokemon.slice(-8).map(p => (
                        <div key={p.id} className="bg-gray-100 rounded-full p-2">
                          <Image
                            src={`/pokemon/${p.id}.png`}
                            alt={p.name}
                            width={48}
                            height={48}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Speaking */}
                {isSpeaking && (
                  <div className="mb-6 bg-yellow-50 rounded-xl px-6 py-4">
                    <p className="text-lg text-gray-800">{currentDialogue}</p>
                  </div>
                )}

                <button
                  onClick={startNewEncounter}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-2xl font-bold px-12 py-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-transform"
                >
                  Find More Pokémon! 🔍
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && session.phase !== 'title' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-30">
              <div className="bg-white rounded-2xl px-8 py-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg text-gray-700">Loading...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
