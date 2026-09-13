import { z } from "zod";
import { buildExperiment } from "@/src/lib/ai/gemini";

const RequestSchema = z.object({
  originalQuestion: z.string().min(1),
  analysis: z.record(z.string(), z.unknown()),
  userAnswers: z.record(z.string(), z.string()),
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

    const experiment = await buildExperiment({
      originalQuestion: parsed.data.originalQuestion,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analysis: parsed.data.analysis as any,
      userAnswers: parsed.data.userAnswers,
    });

    return Response.json(experiment);
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
