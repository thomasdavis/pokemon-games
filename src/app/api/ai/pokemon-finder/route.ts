import { generateObject, openai, z } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

const model = openai("gpt-4o-mini");

export async function POST(request: NextRequest) {
  try {
    const { pokemon, environmentName } = await request.json();

    const { object } = await generateObject({
      model,
      schema: z.object({
        description: z
          .string()
          .describe(
            "A short, playful 1-2 sentence description of where the Pokemon might be hiding and why this environment suits them. Make it fun for a 5-year-old."
          ),
        funFact: z
          .string()
          .describe(
            "A simple, fun fact about this Pokemon that a 5-year-old would enjoy. Keep it short and exciting!"
          ),
      }),
      prompt: `You are helping a 5-year-old play a Pokemon hide-and-seek game!

The child is looking for ${pokemon.name} in the ${environmentName}.

Pokemon Details:
- Name: ${pokemon.name}
- Types: ${pokemon.types.join(", ")}
- Color: ${pokemon.color || "unknown"}
- Species: ${pokemon.genus || "Pokemon"}
- Description: ${pokemon.flavor_text || "A mysterious Pokemon"}
- Habitat: ${pokemon.habitat || "unknown"}
- Height: ${(pokemon.height / 10).toFixed(1)}m
- Weight: ${(pokemon.weight / 10).toFixed(1)}kg

Generate:
1. A playful description (1-2 sentences) that hints at where the Pokemon might be hiding based on its characteristics. Don't give away the exact location! Make it exciting and age-appropriate.

2. A fun fact about this Pokemon that would delight a 5-year-old. Use simple words and make it memorable!

Be enthusiastic, use simple language, and make the child feel like a real Pokemon explorer!`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { description: "", funFact: "" },
      { status: 200 } // Return empty but valid response on error
    );
  }
}
