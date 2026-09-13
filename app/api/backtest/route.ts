import { z } from "zod";
import { runBacktest } from "@/src/lib/backtest/engine";

// This prototype supports daily NIFTY experiments only.
// Weekly and intraday are explicitly rejected with a clear user-facing message.
const ExperimentSchema = z.object({
  instrument: z.string().min(1),
  timeframe: z.enum(["daily", "weekly", "intraday"]),
  entry: z.object({
    condition: z.string().min(1),
    timing: z.string().min(1),
  }),
  exit: z.object({
    condition: z.string().min(1),
  }),
  holdingPeriod: z.object({
    value: z.number().int().positive(),
    unit: z.enum(["trading_days", "weeks"]),
  }),
  testPeriod: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  }),
  filters: z.array(z.string()),
  assumptions: z.object({
    transactionCost: z.number().min(0, "Transaction cost cannot be negative").max(0.5),
    slippage: z.number().min(0, "Slippage cannot be negative").max(0.1),
  }),
  successMetric: z.string().min(1),
  hypothesis: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const parsed = ExperimentSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { error: `Invalid experiment: ${firstIssue?.message ?? "unknown validation error"}` },
      { status: 400 }
    );
  }

  const exp = parsed.data;

  // Explicit timeframe guard with user-friendly message
  if (exp.timeframe !== "daily") {
    return Response.json(
      {
        error:
          `This prototype currently supports daily NIFTY experiments only. ` +
          `Timeframe "${exp.timeframe}" is not supported. Please choose a daily timeframe.`,
      },
      { status: 422 }
    );
  }

  // Date order check
  if (exp.testPeriod.start >= exp.testPeriod.end) {
    return Response.json(
      { error: "Test period start date must be before end date." },
      { status: 422 }
    );
  }

  try {
    const result = runBacktest(exp);
    return Response.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Backtest failed unexpectedly.";
    return Response.json({ error: message }, { status: 500 });
  }
}
