import { z } from "zod";
import { analyzeResearchQuestion } from "@/src/lib/ai/gemini";

const RequestSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters.").max(500),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const analysis = await analyzeResearchQuestion(parsed.data.question);
    return Response.json(analysis);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    // Don't expose internal error details or API key info
    if (message.includes("GEMINI_API_KEY")) {
      return Response.json(
        { error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env.local file." },
        { status: 500 }
      );
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
