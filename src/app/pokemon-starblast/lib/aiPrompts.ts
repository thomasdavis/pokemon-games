// Pokemon Starblast - AI Prompts for Dynamic Content

import { generateObject, generateText, z, defaultModel } from '@/lib/ai';
import { BossDefinition } from '../types';
import { Pokemon } from '@/data/pokemon';

// ============ Schemas ============

const WaveAnnouncementSchema = z.object({
  announcement: z.string().describe('An exciting wave announcement (1-2 sentences)'),
  battleCry: z.string().describe('A short battle cry or encouragement (3-6 words)'),
});

const BossIntroSchema = z.object({
  entrance: z.string().describe('Dramatic boss entrance narration (2-3 sentences)'),
  threat: z.string().describe('What the boss says to threaten the player (1 sentence)'),
});

const BossTauntSchema = z.object({
  taunt: z.string().describe('What the boss says during the fight (1 sentence)'),
  emotion: z.enum(['angry', 'confident', 'desperate', 'amused']),
});

const VictoryMessageSchema = z.object({
  celebration: z.string().describe('Personalized victory celebration (1-2 sentences)'),
  stats: z.string().describe('Comment on their performance (1 sentence)'),
});

const DefeatMessageSchema = z.object({
  encouragement: z.string().describe('Encouraging message after defeat (1-2 sentences)'),
  tip: z.string().describe('A helpful gameplay tip (1 sentence)'),
});

const ComboAnnouncementSchema = z.object({
  shout: z.string().describe('Excited combo announcement (2-4 words)'),
  compliment: z.string().describe('Quick compliment (3-6 words)'),
});

// ============ Cache ============

const messageCache = new Map<string, unknown>();

function getCacheKey(type: string, ...args: (string | number)[]): string {
  return `${type}_${args.join('_')}`;
}

// ============ Wave Announcements ============

export async function generateWaveAnnouncement(
  waveNumber: number,
  waveType: string,
  waveName: string
): Promise<{ announcement: string; battleCry: string }> {
  const cacheKey = getCacheKey('wave', waveNumber);
  const cached = messageCache.get(cacheKey);
  if (cached) return cached as { announcement: string; battleCry: string };

  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: WaveAnnouncementSchema,
      prompt: `Generate an exciting wave announcement for a Pokemon space shooter game.

Wave ${waveNumber}: "${waveName}"
Theme: ${waveType}-type Pokemon

Create:
1. An exciting announcement that builds anticipation (mention the wave number and type theme)
2. A short, punchy battle cry for the player

Keep it fun and appropriate for kids ages 5-10. Make it feel like an epic video game!
Examples of tone: "Wave 5 incoming! Fire-type Pokemon blaze through space!" / "Let's go!"`,
    });

    messageCache.set(cacheKey, object);
    return object;
  } catch (error) {
    // Fallback
    return {
      announcement: `Wave ${waveNumber}: ${waveName}! ${waveType}-type Pokemon incoming!`,
      battleCry: "Let's do this!",
    };
  }
}

// ============ Boss Introductions ============

export async function generateBossIntro(
  boss: BossDefinition
): Promise<{ entrance: string; threat: string }> {
  const cacheKey = getCacheKey('boss_intro', boss.id);
  const cached = messageCache.get(cacheKey);
  if (cached) return cached as { entrance: string; threat: string };

  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: BossIntroSchema,
      prompt: `Generate a dramatic boss introduction for a Pokemon space shooter.

Boss: ${boss.name} (the legendary ${boss.pokemon.types.join('/')} Pokemon)
Wave: ${boss.waveNumber}
Default dialogue: "${boss.introDialogue}"

Create:
1. A dramatic entrance narration describing the boss appearing (epic, cinematic)
2. What the boss says to threaten/challenge the player

Make it feel like a major video game boss fight! Keep appropriate for kids but make it EPIC.
The boss should feel powerful and intimidating but not scary.`,
    });

    messageCache.set(cacheKey, object);
    return object;
  } catch (error) {
    return {
      entrance: `The legendary ${boss.name} descends from the stars! This is it - the ultimate challenge!`,
      threat: boss.introDialogue,
    };
  }
}

// ============ Boss Taunts ============

export async function generateBossTaunt(
  boss: BossDefinition,
  healthPercent: number,
  phase: number
): Promise<{ taunt: string; emotion: string }> {
  // Don't cache taunts - they should vary
  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: BossTauntSchema,
      prompt: `Generate a boss taunt for phase ${phase + 1} of the fight.

Boss: ${boss.name}
Health: ${Math.round(healthPercent * 100)}%
Situation: ${healthPercent > 0.6 ? 'Boss is still strong' : healthPercent > 0.3 ? 'Boss is getting weaker' : 'Boss is nearly defeated'}

What does the boss say? Match the emotion to their situation.
- High health: confident or amused
- Medium health: angry
- Low health: desperate or enraged

Keep it short and impactful! Kid-friendly but dramatic.`,
    });

    return object;
  } catch (error) {
    const taunts = [
      { taunt: "You cannot defeat me!", emotion: 'confident' as const },
      { taunt: "Feel my power!", emotion: 'angry' as const },
      { taunt: "This isn't over!", emotion: 'desperate' as const },
    ];
    return taunts[phase % taunts.length];
  }
}

// ============ Victory Messages ============

export async function generateVictoryMessage(
  playerName: string,
  waveReached: number,
  finalScore: number,
  bossesDefeated: number
): Promise<{ celebration: string; stats: string }> {
  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: VictoryMessageSchema,
      prompt: `Generate a victory celebration for a Pokemon space shooter!

Player: ${playerName}
Waves Completed: ${waveReached}
Final Score: ${finalScore.toLocaleString()}
Bosses Defeated: ${bossesDefeated}

Create:
1. An enthusiastic, personalized celebration using their name
2. A fun comment about their performance

Make ${playerName} feel like a champion! Keep it exciting and kid-friendly.`,
    });

    return object;
  } catch (error) {
    return {
      celebration: `Amazing job, ${playerName}! You're a true Pokemon space champion!`,
      stats: `${waveReached} waves conquered and ${bossesDefeated} legendary bosses defeated!`,
    };
  }
}

// ============ Defeat Messages ============

export async function generateDefeatMessage(
  playerName: string,
  waveReached: number,
  killer: string | null
): Promise<{ encouragement: string; tip: string }> {
  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: DefeatMessageSchema,
      prompt: `Generate an encouraging defeat message for a Pokemon space shooter.

Player: ${playerName}
Reached Wave: ${waveReached}
${killer ? `Defeated by: ${killer}` : ''}

Create:
1. An encouraging message that makes them want to try again (use their name)
2. A helpful gameplay tip

Be supportive and motivating! This is for kids - keep it positive!`,
    });

    return object;
  } catch (error) {
    return {
      encouragement: `Great effort, ${playerName}! You made it to wave ${waveReached}!`,
      tip: "Keep moving and watch for patterns in enemy attacks!",
    };
  }
}

// ============ Combo Announcements ============

export async function generateComboAnnouncement(
  comboCount: number
): Promise<{ shout: string; compliment: string }> {
  const cacheKey = getCacheKey('combo', comboCount);
  const cached = messageCache.get(cacheKey);
  if (cached) return cached as { shout: string; compliment: string };

  try {
    const { object } = await generateObject({
      model: defaultModel,
      schema: ComboAnnouncementSchema,
      prompt: `Generate an excited combo announcement for ${comboCount} hits in a row!

Create:
1. A short excited shout (like "INCREDIBLE!" or "MEGA COMBO!")
2. A quick compliment about their skill

Make it feel like a fighting game combo announcement! Exciting and punchy!
The higher the combo, the more epic it should sound.`,
    });

    messageCache.set(cacheKey, object);
    return object;
  } catch (error) {
    const messages: Record<number, { shout: string; compliment: string }> = {
      5: { shout: 'Nice Combo!', compliment: 'Keep it going!' },
      10: { shout: 'Great Combo!', compliment: "You're on fire!" },
      25: { shout: 'Amazing Combo!', compliment: 'Incredible skills!' },
      50: { shout: 'MEGA COMBO!', compliment: "You're unstoppable!" },
      100: { shout: 'LEGENDARY!', compliment: 'Absolute champion!' },
    };
    return messages[comboCount] || { shout: 'Combo!', compliment: 'Great job!' };
  }
}

// ============ Quick Fallback Messages (No AI) ============

export function getQuickWaveAnnouncement(
  waveNumber: number,
  waveType: string,
  waveName: string
): { announcement: string; battleCry: string } {
  const announcements = [
    `Wave ${waveNumber} incoming! ${waveType}-type Pokemon approach!`,
    `Here comes wave ${waveNumber}! Get ready for ${waveType}-types!`,
    `Wave ${waveNumber}: ${waveName}! They're coming!`,
  ];

  const cries = [
    "Let's go!",
    "Bring it on!",
    "Here we go!",
    "Battle stations!",
  ];

  return {
    announcement: announcements[waveNumber % announcements.length],
    battleCry: cries[waveNumber % cries.length],
  };
}

export function getQuickBossIntro(boss: BossDefinition): { entrance: string; threat: string } {
  return {
    entrance: `WARNING! The legendary ${boss.name} has appeared! This is a boss fight!`,
    threat: boss.introDialogue,
  };
}

export function getQuickComboMessage(combo: number): { shout: string; compliment: string } {
  if (combo >= 100) return { shout: 'LEGENDARY!', compliment: 'Unbelievable!' };
  if (combo >= 50) return { shout: 'MEGA COMBO!', compliment: 'Incredible!' };
  if (combo >= 25) return { shout: 'AMAZING!', compliment: 'So good!' };
  if (combo >= 10) return { shout: 'GREAT!', compliment: 'Nice work!' };
  return { shout: 'NICE!', compliment: 'Keep going!' };
}

// ============ Clear Cache ============

export function clearAICache(): void {
  messageCache.clear();
}
