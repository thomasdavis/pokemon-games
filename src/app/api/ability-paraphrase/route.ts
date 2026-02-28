import { generateText, openai } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

// Base ability descriptions - used as input for AI paraphrasing
const ABILITY_DESCRIPTIONS: Record<string, string> = {
  // Starter abilities
  "Overgrow": "Powers up Grass-type moves when the Pokemon's HP is low.",
  "Blaze": "Powers up Fire-type moves when the Pokemon's HP is low.",
  "Torrent": "Powers up Water-type moves when the Pokemon's HP is low.",
  "Swarm": "Powers up Bug-type moves when the Pokemon's HP is low.",

  // Common abilities
  "Chlorophyll": "Boosts the Pokemon's Speed stat in harsh sunlight.",
  "Solar Power": "Boosts the Special Attack stat in harsh sunlight, but HP decreases every turn.",
  "Rain Dish": "The Pokemon gradually recovers HP in rain.",
  "Swift Swim": "Boosts the Pokemon's Speed stat in rain.",
  "Sand Rush": "Boosts the Pokemon's Speed stat in a sandstorm.",
  "Sand Veil": "Boosts the Pokemon's evasiveness in a sandstorm.",
  "Sand Stream": "The Pokemon summons a sandstorm when it enters a battle.",
  "Snow Cloak": "Boosts evasiveness in a hailstorm.",
  "Slush Rush": "Boosts the Pokemon's Speed stat in a hailstorm.",
  "Snow Warning": "The Pokemon summons a hailstorm when it enters a battle.",
  "Drought": "Turns the sunlight harsh when the Pokemon enters a battle.",
  "Drizzle": "The Pokemon makes it rain when it enters a battle.",

  // Defensive abilities
  "Sturdy": "The Pokemon cannot be knocked out with one hit. One-hit KO moves also cannot knock it out.",
  "Shell Armor": "A hard shell protects the Pokemon from critical hits.",
  "Battle Armor": "Hard armor protects the Pokemon from critical hits.",
  "Rock Head": "Protects the Pokemon from recoil damage.",
  "Thick Fat": "The Pokemon is protected by a layer of thick fat, which halves the damage taken from Fire and Ice-type moves.",
  "Marvel Scale": "The Pokemon's Defense stat is boosted if it has a status condition.",
  "Multiscale": "Reduces the amount of damage the Pokemon takes while its HP is full.",
  "Filter": "Reduces the power of supereffective attacks taken.",
  "Solid Rock": "Reduces the power of supereffective attacks taken.",
  "Levitate": "By floating in the air, the Pokemon receives full immunity to all Ground-type moves.",
  "Water Absorb": "Restores HP if hit by a Water-type move instead of taking damage.",
  "Volt Absorb": "Restores HP if hit by an Electric-type move instead of taking damage.",
  "Flash Fire": "Powers up the Pokemon's Fire-type moves if it's hit by one. It also grants immunity to Fire-type moves.",
  "Lightning Rod": "The Pokemon draws in all Electric-type moves. Instead of being hit, it boosts its Special Attack.",
  "Storm Drain": "The Pokemon draws in all Water-type moves. Instead of being hit, it boosts its Special Attack.",
  "Motor Drive": "Boosts its Speed stat if hit by an Electric-type move instead of taking damage.",
  "Sap Sipper": "Boosts the Attack stat if hit by a Grass-type move instead of taking damage.",
  "Wonder Guard": "Only supereffective moves will hit the Pokemon.",
  "Magic Guard": "The Pokemon only takes damage from attacks.",
  "Magic Bounce": "Reflects status moves instead of getting hit by them.",

  // Offensive abilities
  "Huge Power": "Doubles the Pokemon's Attack stat.",
  "Pure Power": "Doubles the Pokemon's Attack stat through meditation.",
  "Adaptability": "Powers up moves of the same type as the Pokemon.",
  "Technician": "Powers up the Pokemon's weaker moves.",
  "Skill Link": "Maximizes the number of times multistrike moves hit.",
  "Sniper": "Powers up moves if they become critical hits.",
  "Super Luck": "The Pokemon is so lucky that the critical-hit ratios of its moves are boosted.",
  "Hustle": "Boosts the Attack stat, but lowers accuracy.",
  "Sheer Force": "Removes additional effects from moves to increase their power.",
  "Iron Fist": "Powers up punching moves.",
  "Reckless": "Powers up moves that have recoil damage.",
  "Moxie": "The Pokemon shows moxie, and boosts its Attack stat after knocking out any Pokemon.",
  "Download": "Compares the opponent's Defense and Sp. Def stats before raising its own Attack or Sp. Atk stat.",
  "Contrary": "Makes stat changes have an opposite effect.",
  "Defiant": "Boosts the Pokemon's Attack stat sharply when its stats are lowered.",
  "Competitive": "Boosts the Pokemon's Sp. Atk stat sharply when its stats are lowered.",
  "Guts": "Boosts the Attack stat if the Pokemon has a status condition.",
  "Toxic Boost": "Powers up physical attacks when the Pokemon is poisoned.",
  "Flare Boost": "Powers up special attacks when the Pokemon is burned.",

  // Speed abilities
  "Speed Boost": "The Pokemon's Speed stat is boosted every turn.",
  "Quick Feet": "Boosts the Speed stat if the Pokemon has a status condition.",
  "Unburden": "Boosts the Speed stat if the Pokemon's held item is used or lost.",
  "Prankster": "Gives priority to status moves.",

  // Status abilities
  "Poison Point": "Contact with the Pokemon may poison the attacker.",
  "Static": "The Pokemon is charged with static electricity, so contact with it may cause paralysis.",
  "Flame Body": "Contact with the Pokemon may burn the attacker.",
  "Effect Spore": "Contact with the Pokemon may inflict poison, sleep, or paralysis on its attacker.",
  "Cute Charm": "Contact with the Pokemon may cause infatuation.",
  "Synchronize": "The attacker will receive the same status condition if it inflicts one on the Pokemon.",
  "Poison Touch": "May poison a target when the Pokemon makes contact.",
  "Serene Grace": "Boosts the likelihood of additional effects occurring when attacking.",

  // Immunity abilities
  "Immunity": "The immune system of the Pokemon prevents it from getting poisoned.",
  "Insomnia": "The Pokemon's suffering spirit prevents it from falling asleep.",
  "Vital Spirit": "The Pokemon is full of vitality, and that prevents it from falling asleep.",
  "Own Tempo": "This Pokemon has its own tempo, and cannot be confused.",
  "Inner Focus": "The Pokemon's intense focus prevents it from flinching.",
  "Oblivious": "The Pokemon is oblivious, keeping it from being infatuated or falling for taunts.",
  "Limber": "Its limber body protects the Pokemon from paralysis.",
  "Water Veil": "The Pokemon is covered with a water veil, which prevents burns.",
  "Magma Armor": "The Pokemon is covered with hot magma, which prevents it from being frozen.",

  // Terrain and field abilities
  "Arena Trap": "Prevents opposing Pokemon from fleeing.",
  "Shadow Tag": "This Pokemon steps on the opposing Pokemon's shadow to prevent it from escaping.",
  "Magnet Pull": "Prevents Steel-type Pokemon from escaping using its magnetic force.",
  "Intimidate": "The Pokemon intimidates opposing Pokemon upon entering battle, lowering their Attack stat.",
  "Pressure": "By putting pressure on the opposing Pokemon, it raises their PP usage.",
  "Unnerve": "Unnerves opposing Pokemon and makes them unable to eat Berries.",
  "Mold Breaker": "Moves can be used on the target regardless of its Abilities.",
  "Teravolt": "Moves can be used on the target regardless of its Abilities.",
  "Turboblaze": "Moves can be used on the target regardless of its Abilities.",

  // Weather immunity
  "Overcoat": "Protects the Pokemon from things like sand, hail, and powder.",
  "Ice Body": "The Pokemon gradually regains HP in a hailstorm.",
  "Hydration": "Heals status conditions if it's raining.",
  "Dry Skin": "Restores HP in rain or when hit by Water-type moves. Reduces HP in harsh sunlight and increases damage from Fire-type moves.",
  "Leaf Guard": "Prevents status conditions in harsh sunlight.",

  // Transformation abilities
  "Imposter": "The Pokemon transforms into the Pokemon it's facing.",
  "Illusion": "Comes out disguised as the Pokemon in the party's last spot.",
  "Color Change": "The Pokemon's type becomes the type of the move used on it.",
  "Protean": "Changes the Pokemon's type to the type of the move it's about to use.",
  "Libero": "Changes the Pokemon's type to the type of the move it's about to use.",

  // Unique abilities
  "Truant": "The Pokemon can't use a move if it had used a move on the previous turn.",
  "Slow Start": "For five turns, the Pokemon's Attack and Speed stats are halved.",
  "Defeatist": "Halves the Pokemon's Attack and Sp. Atk stats when its HP becomes half or less.",
  "Stall": "The Pokemon moves after all other Pokemon do.",
  "Normalize": "All the Pokemon's moves become Normal type.",
  "Aerilate": "Normal-type moves become Flying-type moves and their power is boosted.",
  "Pixilate": "Normal-type moves become Fairy-type moves and their power is boosted.",
  "Refrigerate": "Normal-type moves become Ice-type moves and their power is boosted.",
  "Galvanize": "Normal-type moves become Electric-type moves and their power is boosted.",
  "No Guard": "The Pokemon employs no-guard tactics to ensure incoming and outgoing attacks always land.",
  "Trace": "When it enters a battle, the Pokemon copies an opposing Pokemon's Ability.",
  "Forecast": "The Pokemon transforms with the weather to change its type.",
  "Flower Gift": "Boosts the Attack and Sp. Def stats of itself and allies in harsh sunlight.",
  "Multitype": "Changes the Pokemon's type to match the Plate or Z-Crystal it holds.",
  "RKS System": "Changes the Pokemon's type to match the memory disc it holds.",
  "Stance Change": "The Pokemon changes its form to Blade Forme when it uses an attack move and changes to Shield Forme when it uses King's Shield.",
  "Schooling": "When it has a lot of HP, the Pokemon forms a powerful school. It stops schooling when its HP is low.",
  "Battle Bond": "Defeating an opposing Pokemon strengthens the Pokemon's bond with its Trainer.",
  "Power Construct": "Cells gather to increase its power when its HP drops to half or less.",
  "Shields Down": "When its HP drops below half, the Pokemon's shell breaks and it becomes aggressive.",
  "Disguise": "Once per battle, the Pokemon can withstand one physical attack using its disguise.",
  "Comatose": "The Pokemon is always asleep but can still attack.",
  "Gulp Missile": "When the Pokemon uses Surf or Dive, it will come back with prey.",
  "Ice Face": "The Pokemon's ice head can take a physical attack, but the ice will break.",

  // Other common abilities
  "Run Away": "Enables a sure getaway from wild Pokemon.",
  "Pickup": "The Pokemon may pick up items.",
  "Keen Eye": "The Pokemon's keen eyes prevent other Pokemon from lowering its accuracy.",
  "Compound Eyes": "The Pokemon's compound eyes boost its accuracy.",
  "Tinted Lens": "The Pokemon can use not very effective moves to deal regular damage.",
  "Natural Cure": "All status conditions heal when the Pokemon switches out.",
  "Regenerator": "Restores a little HP when withdrawn from battle.",
  "Shed Skin": "The Pokemon may heal its own status conditions by shedding its skin.",
  "Early Bird": "The Pokemon awakens from sleep twice as fast as other Pokemon.",
  "Harvest": "May create another Berry after one is used.",
  "Gluttony": "Makes the Pokemon eat a held Berry when its HP drops to half or less.",
  "Ripen": "Ripens Berries and doubles their effect.",
  "Cheek Pouch": "Restores HP as well when the Pokemon eats a Berry.",

  // Physical feature abilities
  "Suction Cups": "This Pokemon uses suction cups to stay in one spot to prevent being forced to switch out.",
  "Sticky Hold": "Items held by the Pokemon are stuck fast and cannot be removed by other Pokemon.",
  "Clear Body": "Prevents other Pokemon's moves or Abilities from lowering the Pokemon's stats.",
  "White Smoke": "The Pokemon is protected by its white smoke, which prevents other Pokemon from lowering its stats.",
  "Full Metal Body": "Prevents other Pokemon's moves or Abilities from lowering the Pokemon's stats.",
  "Hyper Cutter": "The Pokemon's proud of its powerful pincers. They prevent other Pokemon from lowering its Attack stat.",
  "Big Pecks": "Protects the Pokemon from Defense-lowering effects.",
  "Light Metal": "Halves the Pokemon's weight.",
  "Heavy Metal": "Doubles the Pokemon's weight.",

  // Sound abilities
  "Soundproof": "Soundproofing gives the Pokemon full immunity to all sound-based moves.",
  "Liquid Voice": "All sound-based moves become Water-type moves.",
  "Punk Rock": "Boosts the power of sound-based moves. Also halves the damage from these kinds of moves.",

  // Miscellaneous
  "Klutz": "The Pokemon can't use any held items.",
  "Simple": "The stat changes the Pokemon receives are doubled.",
  "Unaware": "When attacking, the Pokemon ignores the target Pokemon's stat changes.",
  "Stench": "By releasing a stench when attacking, this Pokemon may cause the target to flinch.",
  "Frisk": "When it enters a battle, the Pokemon can check an opposing Pokemon's held item.",
  "Anticipation": "The Pokemon can sense an opposing Pokemon's dangerous moves.",
  "Forewarn": "When it enters a battle, the Pokemon can tell one of the moves an opposing Pokemon has.",
  "Telepathy": "Anticipates an ally's attack and dodges it.",
  "Justified": "Being hit by a Dark-type move boosts the Attack stat of the Pokemon, for justice.",
  "Rattled": "Dark-, Ghost-, and Bug-type moves scare the Pokemon and boost its Speed stat.",
  "Cursed Body": "May disable a move used on the Pokemon.",
  "Mummy": "Contact with the Pokemon changes the attacker's Ability to Mummy.",
  "Wandering Spirit": "The Pokemon exchanges Abilities with a Pokemon that hits it with a move that makes direct contact.",
  "Bad Dreams": "Reduces the HP of sleeping opposing Pokemon.",
  "Perish Body": "When hit by a move that makes direct contact, the Pokemon and the attacker will faint after three turns.",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { abilityName, playerName } = body;

    if (!abilityName) {
      return NextResponse.json(
        { error: 'Missing abilityName' },
        { status: 400 }
      );
    }

    // Get the base description or create a generic one
    const baseDescription = ABILITY_DESCRIPTIONS[abilityName] ||
      `This is a special ability called ${abilityName} that makes the Pokemon unique!`;

    const prompt = `You are a friendly Pokemon professor teaching kids aged 5-10 about Pokemon abilities.
Make this ability description fun, simple, and easy to understand:

Ability: ${abilityName}
Original description: ${baseDescription}

Rules:
- Use simple words a young child would understand
- Make it sound exciting and fun
- Keep it to 1-2 short sentences
- Don't use complex game terms
- You can use comparisons kids would understand
${playerName ? `- You're talking to ${playerName}` : ''}

Just give the fun description, nothing else.`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    });

    return NextResponse.json({
      text,
      originalDescription: baseDescription,
      abilityName,
    });
  } catch (error) {
    console.error('Ability paraphrase API error:', error);
    return NextResponse.json(
      { error: 'Failed to paraphrase ability' },
      { status: 500 }
    );
  }
}

// Export ability descriptions for use by the game
export { ABILITY_DESCRIPTIONS };
