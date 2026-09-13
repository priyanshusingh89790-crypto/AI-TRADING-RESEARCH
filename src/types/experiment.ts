// ─── Field metadata ──────────────────────────────────────────────────────────

export type FieldStatus = "user_provided" | "inferred" | "missing";

export type Confidence = "high" | "medium" | "low";

export type ResearchField = {
  value: string | null;
  status: FieldStatus;
  confidence: Confidence;
};

// ─── Clarification ───────────────────────────────────────────────────────────

export type Clarification = {
  field: string;
  question: string;
  reason: string;
  options: string[];
  required: boolean;
};

// ─── Research analysis (AI output from /api/analyze) ─────────────────────────

export type ResearchFields = {
  instrument: ResearchField;
  timeframe: ResearchField;
  entryCondition: ResearchField;
  entryTiming: ResearchField;
  exitCondition: ResearchField;
  holdingPeriod: ResearchField;
  testPeriod: ResearchField;
  filters: ResearchField;
  successMetric: ResearchField;
};

export type ResearchAnalysis = {
  originalQuestion: string;
  interpretation: string;
  fields: ResearchFields;
  clarifications: Clarification[];
  hypothesis: string;
};

// ─── User answers to clarification questions ─────────────────────────────────

export type UserAnswers = Record<string, string>;

// ─── Structured experiment ───────────────────────────────────────────────────

export type Experiment = {
  instrument: string;
  /** This prototype supports "daily" only. Weekly and intraday are not implemented. */
  timeframe: "daily" | "weekly" | "intraday";
  entry: {
    condition: string;
    timing: string;
  };
  exit: {
    condition: string;
  };
  holdingPeriod: {
    value: number;
    unit: "trading_days" | "weeks";
  };
  testPeriod: {
    start: string; // ISO date string YYYY-MM-DD
    end: string;
  };
  filters: string[];
  assumptions: {
    /** Illustrative prototype assumption — not a calibrated execution cost estimate. */
    transactionCost: number; // decimal, e.g. 0.001 = 0.1%
    /** Illustrative prototype assumption — not a calibrated execution cost estimate. */
    slippage: number;
  };
  successMetric: string;
  hypothesis: string;
};

// ─── Backtest ────────────────────────────────────────────────────────────────

export type Trade = {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  returnPct: number; // after costs
  triggerReturn: number; // the fall % that triggered entry
};

export type BacktestResult = {
  tradeCount: number;
  averageReturn: number;
  medianReturn: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  cumulativeReturn: number;
  trades: Trade[];
};

// ─── AI explanation ───────────────────────────────────────────────────────────

export type ResearchConclusion = {
  dataSummary: string;
  interpretation: string;
  limitations: string[];
  conclusion: string;
  nextQuestions: string[];
};
