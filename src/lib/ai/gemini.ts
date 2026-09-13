/**
 * Gemini AI provider abstraction.
 * All Gemini-specific SDK usage is isolated here.
 * Swap this file to change AI providers.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  ResearchAnalysis,
  Experiment,
  ResearchConclusion,
} from "@/src/types/experiment";

// ─── Schema definitions (used for response validation) ───────────────────────

const ResearchFieldSchema = z.object({
  value: z.string().nullable(),
  status: z.enum(["user_provided", "inferred", "missing"]),
  confidence: z.enum(["high", "medium", "low"]),
});

const ClarificationSchema = z.object({
  field: z.string(),
  question: z.string(),
  reason: z.string(),
  options: z.array(z.string()),
  required: z.boolean(),
});

export const ResearchAnalysisSchema = z.object({
  originalQuestion: z.string(),
  interpretation: z.string(),
  fields: z.object({
    instrument: ResearchFieldSchema,
    timeframe: ResearchFieldSchema,
    entryCondition: ResearchFieldSchema,
    entryTiming: ResearchFieldSchema,
    exitCondition: ResearchFieldSchema,
    holdingPeriod: ResearchFieldSchema,
    testPeriod: ResearchFieldSchema,
    filters: ResearchFieldSchema,
    successMetric: ResearchFieldSchema,
  }),
  clarifications: z.array(ClarificationSchema),
  hypothesis: z.string(),
});

// Only "daily" is supported by the backtest engine and dataset.
export const ExperimentSchema = z.object({
  instrument: z.string(),
  timeframe: z.enum(["daily"]),
  entry: z.object({
    condition: z.string(),
    timing: z.string(),
  }),
  exit: z.object({
    condition: z.string(),
  }),
  holdingPeriod: z.object({
    value: z.number().int().positive(),
    unit: z.enum(["trading_days", "weeks"]),
  }),
  testPeriod: z.object({
    start: z.string(),
    end: z.string(),
  }),
  filters: z.array(z.string()),
  assumptions: z.object({
    transactionCost: z.number().min(0),
    slippage: z.number().min(0),
  }),
  successMetric: z.string(),
  hypothesis: z.string(),
});

export const ResearchConclusionSchema = z.object({
  dataSummary: z.string(),
  interpretation: z.string(),
  limitations: z.array(z.string()),
  conclusion: z.string(),
  nextQuestions: z.array(z.string()),
});

// ─── Client init ─────────────────────────────────────────────────────────────

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file."
    );
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL = "gemini-3.6-flash";

// ─── Helper: call Gemini and parse JSON ──────────────────────────────────────

async function callGemini(
  systemInstruction: string,
  userPrompt: string
): Promise<unknown> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

// ─── Public AI functions ──────────────────────────────────────────────────────

export async function analyzeResearchQuestion(
  question: string
): Promise<ResearchAnalysis> {
  const systemInstruction = `You are a financial research experiment interpreter.
Your task is to convert natural-language market research questions into structured research specifications.
You are not a trading advisor. Do not claim that a strategy is profitable.
Extract only information supported by the user's question.

For every important field distinguish between:
- user_provided: explicitly mentioned by the user
- inferred: logically implied but not explicitly stated
- missing: cannot be determined from the question

If an important parameter is ambiguous or missing, do not silently invent it. Create a concise clarification question.

Important parameters include:
- instrument (e.g., NIFTY 50, SENSEX)
- timeframe (daily, weekly, intraday)
- entry condition (what triggers a trade)
- entry timing (when exactly to enter: open, close, etc.)
- exit condition (what triggers exit)
- holding period (how long to hold)
- test period (historical date range)
- filters (additional conditions)
- success metric (what defines "working")

Terms such as "sharp fall", "works", "strong", "good performance", or "significant move" are ambiguous and MUST be clarified when they materially affect the experiment.

Ask the minimum number of questions required to make the experiment meaningful.
Do not calculate historical performance.

Return ONLY valid JSON matching the specified schema. No markdown, no extra text.`;

  const userPrompt = `Analyze this market research question and return a structured JSON object:

Question: "${question}"

Return JSON with this exact structure:
{
  "originalQuestion": "...",
  "interpretation": "...",
  "fields": {
    "instrument": { "value": "..." or null, "status": "user_provided"|"inferred"|"missing", "confidence": "high"|"medium"|"low" },
    "timeframe": { "value": "..." or null, "status": "...", "confidence": "..." },
    "entryCondition": { "value": "..." or null, "status": "...", "confidence": "..." },
    "entryTiming": { "value": "..." or null, "status": "...", "confidence": "..." },
    "exitCondition": { "value": "..." or null, "status": "...", "confidence": "..." },
    "holdingPeriod": { "value": "..." or null, "status": "...", "confidence": "..." },
    "testPeriod": { "value": "..." or null, "status": "...", "confidence": "..." },
    "filters": { "value": "..." or null, "status": "...", "confidence": "..." },
    "successMetric": { "value": "..." or null, "status": "...", "confidence": "..." }
  },
  "clarifications": [
    {
      "field": "fieldName",
      "question": "...",
      "reason": "...",
      "options": ["option1", "option2", "Custom"],
      "required": true
    }
  ],
  "hypothesis": "..."
}`;

  const raw = await callGemini(systemInstruction, userPrompt);
  return ResearchAnalysisSchema.parse(raw);
}

export interface BuildExperimentInput {
  originalQuestion: string;
  analysis: ResearchAnalysis;
  userAnswers: Record<string, string>;
}

export async function buildExperiment(
  input: BuildExperimentInput
): Promise<Experiment> {
  const { originalQuestion, analysis, userAnswers } = input;

  const systemInstruction = `You are a financial research experiment builder.
Your task is to generate a precise, structured experiment definition from a research question, AI analysis, and user-provided answers.

Rules:
- Use ONLY information from the original question, the analysis, and the user's answers.
- Do NOT invent parameters.
- timeframe MUST always be "daily". This prototype only supports daily experiments.
- filters MUST be an empty array []. This prototype does not support additional filters.
- Apply these application defaults ONLY if the user did not provide them:
  * testPeriod: start="2018-01-01", end="2025-12-31"
  * transactionCost: 0.001 (illustrative prototype assumption, 0.1%)
  * slippage: 0.0005 (illustrative prototype assumption, 0.05%)
- The instrument field must be the canonical index name (e.g., "NIFTY 50").
- entry.condition must include a specific percentage such as "Daily close falls ≥ 2%".
- entry.timing must be either "Next trading day's open" or "Same day's close".
- Return ONLY valid JSON. No markdown, no extra text.`;

  const analysisContext = JSON.stringify({
    fields: analysis.fields,
    clarifications: analysis.clarifications,
  }, null, 2);

  const answersContext = JSON.stringify(userAnswers, null, 2);

  const userPrompt = `Build a structured experiment from the following information:

Original Question: "${originalQuestion}"

AI Analysis (fields and clarifications):
${analysisContext}

User Answers to Clarification Questions:
${answersContext}

Return JSON with this exact structure:
{
  "instrument": "NIFTY 50",
  "timeframe": "daily",
  "entry": {
    "condition": "Daily close falls by X% or more from previous day",
    "timing": "Next trading day open"
  },
  "exit": {
    "condition": "After holding period"
  },
  "holdingPeriod": {
    "value": 5,
    "unit": "trading_days"
  },
  "testPeriod": {
    "start": "2018-01-01",
    "end": "2025-12-31"
  },
  "filters": [],
  "assumptions": {
    "transactionCost": 0.001,
    "slippage": 0.0005
  },
  "successMetric": "Average return per trade",
  "hypothesis": "..."
}`;

  const raw = await callGemini(systemInstruction, userPrompt);
  return ExperimentSchema.parse(raw);
}

export interface ExplainBacktestInput {
  experiment: Experiment;
  results: {
    tradeCount: number;
    averageReturn: number;
    medianReturn: number;
    winRate: number;
    bestTrade: number;
    worstTrade: number;
    cumulativeReturn: number;
  };
}

export async function explainBacktest(
  input: ExplainBacktestInput
): Promise<ResearchConclusion> {
  const { experiment, results } = input;

  const systemInstruction = `You are a financial research analyst providing factual interpretation of synthetic demo backtest results.

CRITICAL RULES:
- Do NOT change, invent, or contradict the exact numerical results provided.
- These results come from a SYNTHETIC DEMO dataset, not real NIFTY historical data. Always acknowledge this.
- If tradeCount is 0, state clearly that no conclusion can be drawn from zero qualifying trades.
- The dataSummary must be a factual statement derived ONLY from the numbers given.
- The interpretation section should explain what the data MIGHT suggest — use cautious language.
- Do NOT claim "this strategy works" or imply a persistent trading edge.
- The conclusion must acknowledge: synthetic data, parameter sensitivity, sample size limits.
- Prefer language like "the sample shows..." rather than "this strategy produces...".
- Provide 4-5 concrete next research questions.
- Return ONLY valid JSON. No markdown, no extra text.`;

  const experimentContext = JSON.stringify(experiment, null, 2);
  const resultsContext = JSON.stringify({
    tradeCount: results.tradeCount,
    averageReturn: `${(results.averageReturn * 100).toFixed(2)}%`,
    medianReturn: `${(results.medianReturn * 100).toFixed(2)}%`,
    winRate: `${(results.winRate * 100).toFixed(1)}%`,
    bestTrade: `${(results.bestTrade * 100).toFixed(2)}%`,
    worstTrade: `${(results.worstTrade * 100).toFixed(2)}%`,
    cumulativeReturn: `${(results.cumulativeReturn * 100).toFixed(1)}%`,
  }, null, 2);

  const userPrompt = `Explain these demo backtest results for a research experiment on SYNTHETIC NIFTY-like data:

Experiment:
${experimentContext}

Exact Numerical Results from the deterministic backtest engine (do not change these numbers):
${resultsContext}

${results.tradeCount === 0 ? "NOTE: Zero qualifying trades were found. State clearly that no conclusion can be drawn." : ""}

Return JSON with this exact structure:
{
  "dataSummary": "Factual statement only: e.g. 'On the synthetic demo dataset, X qualifying signals produced an average Y-day return of Z% under these assumptions.'",
  "interpretation": "Cautious: what the sample data MIGHT suggest, not what the strategy definitively does...",
  "limitations": [
    "Results are based on synthetic demo data, not real NIFTY historical prices",
    "These results do not constitute evidence of actual NIFTY market performance",
    "Transaction cost and slippage are illustrative prototype assumptions only",
    "..."
  ],
  "conclusion": "Cautious conclusion using language like 'the sample shows...' — avoid claiming a persistent edge...",
  "nextQuestions": [
    "Does the effect become stronger after larger declines?",
    "..."
  ]
}`;

  const raw = await callGemini(systemInstruction, userPrompt);
  return ResearchConclusionSchema.parse(raw);
}
