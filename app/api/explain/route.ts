import { z } from "zod";
import { explainBacktest } from "@/src/lib/ai/gemini";

const RequestSchema = z.object({
  experiment: z.record(z.string(), z.unknown()),
  results: z.object({
    tradeCount: z.number(),
    averageReturn: z.number(),
    medianReturn: z.number(),
    winRate: z.number(),
    bestTrade: z.number(),
    worstTrade: z.number(),
    cumulativeReturn: z.number(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request: " + parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const conclusion = await explainBacktest({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experiment: parsed.data.experiment as any,
      results: parsed.data.results,
    });

    return Response.json(conclusion);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    if (message.includes("GEMINI_API_KEY")) {
      return Response.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
