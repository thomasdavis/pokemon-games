import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

// Pokemon shape descriptions for visual context
const shapeDescriptions: Record<string, string> = {
  ball: "round, spherical creatures",
  squiggle: "serpentine, winding creatures",
  fish: "aquatic, streamlined creatures",
  arms: "creatures with prominent arms",
  blob: "amorphous, blobby creatures",
  upright: "bipedal, standing creatures",
  legs: "creatures with prominent legs",
  quadruped: "four-legged creatures",
  wings: "winged, flying creatures",
  tentacles: "creatures with tentacles",
  heads: "creatures that are mostly head",
  humanoid: "human-like creatures",
  bug_wings: "insect-like winged creatures",
  armor: "armored, protected creatures",
};

// Habitat-based environment enrichment
const habitatEnrichment: Record<string, string> = {
  cave: "deep underground caverns with stalactites, glowing crystals, echoing chambers, underground rivers, mysterious shadows",
  forest: "ancient woodland with towering trees, dappled sunlight, fallen logs covered in moss, ferns, wildflowers, mushroom patches",
  grassland: "rolling meadows with tall grass swaying, wildflowers dotting the landscape, gentle hills, clear blue skies",
  mountain: "rugged mountain peaks with rocky outcrops, alpine meadows, mountain streams, distant snow-capped summits",
  rare: "mysterious ethereal realm with floating islands, strange crystalline structures, otherworldly lighting, magical atmosphere",
  "rough-terrain": "jagged rocky landscape with boulders, crevices, rough ground, scattered stones, challenging terrain",
  sea: "underwater ocean depths with coral formations, schools of fish, swaying seaweed, sunbeams filtering through water",
  urban: "cityscape with buildings, streets, parks, human-made structures blending with nature pockets",
  "waters-edge": "shoreline where water meets land, sandy beaches, tide pools, reeds, lily pads, riverside vegetation",
};

// Color palette enrichment
const colorPaletteEnrichment: Record<string, string> = {
  red: "warm reds, oranges, and crimson tones dominating the palette, fiery accents, sunset-like warmth",
  blue: "cool blues, teals, and cyan hues throughout, oceanic depths, sky-like serenity",
  yellow: "golden yellows, warm ambers, and sunny tones, bright and cheerful atmosphere",
  green: "lush greens, emerald tones, and forest colors, natural and organic feeling",
  black: "deep shadows, midnight tones, and dark mysterious atmosphere with subtle highlights",
  white: "pure whites, soft grays, and ethereal brightness, clean and pristine feeling",
  brown: "earthy browns, warm tans, and natural wood tones, grounded and organic",
  purple: "mystical purples, violet hues, and magical undertones, dreamlike atmosphere",
  pink: "soft pinks, rose tones, and gentle magenta accents, sweet and whimsical",
  gray: "silvery grays, metallic tones, and neutral balance, sophisticated atmosphere",
};

// Type-based primary environments
const typeEnvironments: Record<string, string> = {
  fire: "volcanic landscape with flowing lava, ember-filled air, geothermal vents, ash clouds, heat shimmer",
  water: "aquatic realm with coral reefs, underwater caves, bubbling currents, bioluminescent depths",
  grass: "verdant forest with ancient trees, flowering meadows, tangled vines, sun-dappled clearings",
  electric: "storm-charged environment with crackling energy, lightning-scorched earth, glowing conduits",
  psychic: "surreal mindscape with floating geometric shapes, impossible architecture, swirling cosmic energy",
  ground: "desert canyon with layered rock formations, hidden caves, ancient fossils, wind-carved arches",
  rock: "crystal cavern with gemstone formations, rocky pillars, underground lakes reflecting light",
  ice: "frozen wonderland with glacial formations, ice caves, aurora-lit skies, pristine snow fields",
  ghost: "haunted domain with ethereal mist, crumbling ruins, spectral light, eerie silence",
  poison: "toxic swamp with bubbling pools, strange fungi, twisted flora, noxious vapors",
  flying: "sky realm among the clouds, floating islands, wind currents visible, endless horizon",
  bug: "giant garden from insect perspective, towering flowers, dewdrop-covered leaves, busy ecosystem",
  normal: "idyllic countryside with peaceful meadows, gentle streams, cozy cottages, pastoral beauty",
  fighting: "ancient training grounds with weathered stone, martial monuments, disciplined atmosphere",
  dragon: "legendary lair with treasure hoards, ancient runes, mystical artifacts, primal power",
  dark: "shadow realm with moonlit clearings, lurking darkness, mysterious silhouettes, nocturnal beauty",
  steel: "industrial landscape with metal structures, gleaming surfaces, precision engineering, steam and gears",
  fairy: "enchanted kingdom with magical sparkles, candy-colored structures, whimsical architecture, pure magic",
};

// Generate size-appropriate scene elements based on Pokemon dimensions
const getSizeContext = (heightDm: number, weightHg: number): string => {
  const heightM = heightDm / 10;
  const weightKg = weightHg / 10;

  if (heightM < 0.5) {
    return "The scene should feel MASSIVE in scale, as if viewed from a tiny creature's perspective. Blades of grass tower like trees, pebbles appear as boulders, dewdrops glisten like crystal balls.";
  } else if (heightM < 1) {
    return "The scene should have a cozy, intimate scale with details at ground level prominently featured. Small hiding spots among roots, under leaves, and in flower patches.";
  } else if (heightM < 2) {
    return "The scene should be at a natural human-like scale with varied terrain and multiple levels of detail from ground to eye level.";
  } else if (heightM < 5) {
    return "The scene should accommodate larger creatures with open spaces, substantial hiding spots behind rocks, trees, or structures.";
  } else {
    return "The scene should be EPIC in scale with vast landscapes, dramatic terrain, monumental features that could conceal something enormous.";
  }
};

// Generate personality/behavior context from flavor text
const extractBehaviorContext = (flavorText: string | undefined): string => {
  if (!flavorText) return "";

  const text = flavorText.toLowerCase();
  const behaviors: string[] = [];

  if (text.includes("sleep") || text.includes("nap") || text.includes("drowsy")) {
    behaviors.push("cozy resting spots, soft surfaces, sheltered nooks");
  }
  if (text.includes("hunt") || text.includes("prey") || text.includes("predator")) {
    behaviors.push("strategic vantage points, hiding spots for ambush, shadowy corners");
  }
  if (text.includes("play") || text.includes("mischiev") || text.includes("prank")) {
    behaviors.push("playful elements, interactive features, whimsical details");
  }
  if (text.includes("swim") || text.includes("dive") || text.includes("water")) {
    behaviors.push("water features, pools, streams, aquatic elements");
  }
  if (text.includes("fly") || text.includes("soar") || text.includes("glide")) {
    behaviors.push("elevated perches, open skies, wind-swept features");
  }
  if (text.includes("dig") || text.includes("burrow") || text.includes("underground")) {
    behaviors.push("tunnel entrances, loose soil areas, underground hints");
  }
  if (text.includes("fire") || text.includes("flame") || text.includes("burn")) {
    behaviors.push("heat sources, scorched areas, warm glowing elements");
  }
  if (text.includes("electric") || text.includes("thunder") || text.includes("shock")) {
    behaviors.push("conductive surfaces, energy crackling, storm elements");
  }
  if (text.includes("poison") || text.includes("toxic") || text.includes("venom")) {
    behaviors.push("toxic pools, warning colors, dangerous beauty");
  }
  if (text.includes("psychic") || text.includes("mind") || text.includes("telekin")) {
    behaviors.push("floating objects, ethereal elements, mind-bending geometry");
  }

  return behaviors.length > 0
    ? `Include environmental elements that suggest: ${behaviors.join(", ")}.`
    : "";
};

// Build the sophisticated prompt
const buildSophisticatedPrompt = (pokemon: {
  name: string;
  types: string[];
  color?: string;
  shape?: string;
  habitat?: string;
  genus?: string;
  flavor_text?: string;
  height: number;
  weight: number;
  is_legendary?: boolean;
  is_mythical?: boolean;
  generation?: number;
}): string => {
  const primaryType = pokemon.types[0]?.toLowerCase() || "normal";
  const secondaryType = pokemon.types[1]?.toLowerCase();

  // Base environment from primary type
  const baseEnvironment = typeEnvironments[primaryType] || typeEnvironments.normal;

  // Secondary type influence
  const secondaryInfluence = secondaryType && typeEnvironments[secondaryType]
    ? `Blend in subtle elements of: ${typeEnvironments[secondaryType]}.`
    : "";

  // Habitat enrichment
  const habitatContext = pokemon.habitat && habitatEnrichment[pokemon.habitat]
    ? `The environment specifically features: ${habitatEnrichment[pokemon.habitat]}.`
    : "";

  // Color palette
  const colorContext = pokemon.color && colorPaletteEnrichment[pokemon.color]
    ? `Color palette emphasis: ${colorPaletteEnrichment[pokemon.color]}.`
    : "";

  // Size context
  const sizeContext = getSizeContext(pokemon.height, pokemon.weight);

  // Shape context for camouflage
  const shapeContext = pokemon.shape && shapeDescriptions[pokemon.shape]
    ? `Design hiding spots suitable for ${shapeDescriptions[pokemon.shape]}.`
    : "";

  // Behavior context from flavor text
  const behaviorContext = extractBehaviorContext(pokemon.flavor_text);

  // Species context
  const speciesContext = pokemon.genus
    ? `This is the "${pokemon.genus}" - incorporate thematic elements that relate to this identity.`
    : "";

  // Legendary/Mythical grandeur
  const legendaryContext = pokemon.is_legendary
    ? "Add an air of LEGENDARY grandeur - ancient, powerful, awe-inspiring elements. Sacred grounds, mythic architecture, primal energy."
    : pokemon.is_mythical
    ? "Add MYTHICAL mystique - rare, ethereal, otherworldly beauty. Hidden sacred spaces, magical phenomena, dreamlike quality."
    : "";

  // Generation style hints
  const generationStyle = pokemon.generation
    ? pokemon.generation <= 2
      ? "Classic, nostalgic feel with timeless design elements."
      : pokemon.generation <= 4
      ? "Refined, polished aesthetic with detailed environmental storytelling."
      : pokemon.generation <= 6
      ? "Modern, dynamic environment with rich textures and lighting."
      : "Contemporary, vibrant scene with bold colors and intricate details."
    : "";

  // Camouflage strategy based on color
  const camouflageFocus = `
    CRITICAL FOR CAMOUFLAGE: Scatter MANY ${pokemon.color || "colorful"} objects, elements, and details throughout the ENTIRE scene.
    These ${pokemon.color || "colorful"} elements should be:
    - Various sizes (some similar to the creature's size)
    - Different shapes and forms
    - At multiple depths (foreground, midground, background)
    - Both obvious and subtle placements
    The goal is to make finding a ${pokemon.color || "colorful"} creature extremely challenging.
  `;

  return `
Create a stunning, detailed children's book illustration of a ${primaryType}-type Pokemon's natural habitat.

PRIMARY ENVIRONMENT:
${baseEnvironment}

${secondaryInfluence}

${habitatContext}

${colorContext}

${sizeContext}

${shapeContext}

${behaviorContext}

${speciesContext}

${legendaryContext}

${generationStyle}

${camouflageFocus}

ARTISTIC DIRECTION:
- Style: Vibrant, whimsical, professional children's book illustration
- Quality: Rich details at every level, painterly textures, masterful composition
- Mood: Immersive, inviting, full of wonder and discovery
- Complexity: Extremely busy with hundreds of small details to search through
- Depth: Clear foreground, midground, and background layers
- Lighting: Dynamic, atmospheric lighting that enhances the mood

CRITICAL REQUIREMENTS:
- NO Pokemon, NO creatures, NO characters - ONLY the environment
- NO text, NO logos, NO watermarks
- The scene must be PANORAMIC and fill the entire frame
- Every inch should contain interesting details
- Multiple potential hiding spots that match the color scheme
`.trim();
};

export async function POST(request: NextRequest) {
  try {
    const pokemonData = await request.json();

    // Build the sophisticated prompt
    const prompt = buildSophisticatedPrompt(pokemonData);

    console.log("Generating background with sophisticated prompt for:", pokemonData.name);

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high", // Upgraded to high quality for more detail
    });

    const imageData = response.data?.[0];

    if (imageData?.b64_json) {
      return NextResponse.json({
        image: `data:image/png;base64,${imageData.b64_json}`,
      });
    } else if (imageData?.url) {
      return NextResponse.json({
        image: imageData.url,
      });
    }

    return NextResponse.json({ error: "No image generated" }, { status: 500 });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate background" },
      { status: 500 }
    );
  }
}
