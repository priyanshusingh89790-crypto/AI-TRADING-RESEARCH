"use client";

import { useEffect, useState } from "react";
import type { BacktestResult, Experiment, ResearchConclusion } from "@/src/types/experiment";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";

interface ResultsSectionProps {
  results: BacktestResult;
  experiment: Experiment;
  onConclusionReady?: (conclusion: ResearchConclusion) => void;
}

/** Format a decimal return as a percentage string. 0.0064 → "+0.64%" */
function pct(val: number, decimals = 2): string {
  const sign = val >= 0 ? "+" : "";
  return sign + (val * 100).toFixed(decimals) + "%";
}

function MetricCard({
  label,
  value,
  sub,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-4 bg-white">
      {large ? (
        <>
          <p className="text-3xl font-bold text-zinc-900">{value}</p>
          <p className="text-sm font-medium text-zinc-600 mt-1">{label}</p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </>
      ) : (
        <>
          <p className="text-xl font-semibold text-zinc-800">{value}</p>
          <p className="text-xs font-medium text-zinc-500 mt-1 uppercase tracking-wide">{label}</p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
}

/**
 * Simple SVG sparkline showing the non-overlapping compounded equity curve.
 * Each point represents capital after each sequential trade.
 */
function CumulativeChart({ trades }: { trades: BacktestResult["trades"] }) {
  if (trades.length === 0) return null;

  // Build equity curve: capital starts at 1.0, compounds each trade in order
  const equity: number[] = [1];
  for (const t of trades) {
    equity.push(equity[equity.length - 1] * (1 + t.returnPct));
  }

  const width = 400;
  const height = 80;
  const minE = Math.min(...equity);
  const maxE = Math.max(...equity);
  const range = maxE - minE || 0.01;
  const pad = 4;

  const points = equity.map((v, i) => {
    const x = pad + (i / (equity.length - 1)) * (width - pad * 2);
    const y = pad + ((maxE - v) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const isFinal = equity[equity.length - 1] >= 1;
  // Y position of break-even line (capital = 1.0)
  const breakEvenY = pad + ((maxE - 1) / range) * (height - pad * 2);

  return (
    <div className="border border-zinc-200 rounded-lg p-4 bg-white">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        Compounded equity curve (non-overlapping trades)
      </p>
      <p className="text-xs text-zinc-400 mb-3">
        Capital starting at 1.0 — each bar is one completed trade applied sequentially.
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label="Non-overlapping compounded equity curve"
        role="img"
        className="overflow-visible"
      >
        {/* Break-even line at capital = 1.0 */}
        {breakEvenY >= pad && breakEvenY <= height - pad && (
          <line
            x1={pad}
            y1={breakEvenY}
            x2={width - pad}
            y2={breakEvenY}
            stroke="#e4e4e7"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={isFinal ? "#16a34a" : "#dc2626"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-zinc-400 mt-1">
        <span>Trade 1</span>
        <span>Trade {trades.length}</span>
      </div>
    </div>
  );
}

/** Shown when the backtest found zero qualifying trades. */
function ZeroTradeResult() {
  return (
    <div className="border border-zinc-200 rounded-lg p-6 bg-zinc-50 text-center">
      <p className="text-sm font-medium text-zinc-700">
        No qualifying signals were found for this experiment.
      </p>
      <p className="text-xs text-zinc-500 mt-1">
        The entry condition did not trigger for any day in the selected test period.
        Try a lower threshold, a wider date range, or different parameters.
      </p>
    </div>
  );
}

export function ResultsSection({ results, experiment, onConclusionReady }: ResultsSectionProps) {
  const [conclusion, setConclusion] = useState<ResearchConclusion | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const holdingStr =
    experiment.holdingPeriod.unit === "weeks"
      ? `${experiment.holdingPeriod.value}-week`
      : `${experiment.holdingPeriod.value}-day`;

  // Fetch AI explanation automatically once results are available.
  // The engine has already computed exact numbers — AI only explains them.
  useEffect(() => {
    async function fetchExplanation() {
      setLoadingExplanation(true);
      setExplanationError(null);
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experiment,
            results: {
              tradeCount: results.tradeCount,
              averageReturn: results.averageReturn,
              medianReturn: results.medianReturn,
              winRate: results.winRate,
              bestTrade: results.bestTrade,
              worstTrade: results.worstTrade,
              cumulativeReturn: results.cumulativeReturn,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setExplanationError(data.error ?? "Failed to get AI interpretation.");
          return;
        }
        setConclusion(data);
        onConclusionReady?.(data);
      } catch {
        setExplanationError("Could not reach the server for AI interpretation.");
      } finally {
        setLoadingExplanation(false);
      }
    }
    fetchExplanation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-labelledby="results-heading" className="space-y-6">
      {/* Header */}
      <div>
        <h2 id="results-heading" className="text-lg font-semibold text-zinc-900">
          Backtest Results
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {experiment.instrument} · {experiment.testPeriod.start} → {experiment.testPeriod.end} ·{" "}
          {holdingStr} hold
        </p>
        {/* Synthetic data disclaimer — always visible */}
        <div className="mt-2 rounded bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800 font-medium">
            Demo backtest using synthetic NIFTY-like data.
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Results are illustrative and are not evidence of actual NIFTY historical performance.
            The prototype treats NIFTY 50 index prices as the research series — not a tradable instrument.
            Transaction cost ({(experiment.assumptions.transactionCost * 100).toFixed(2)}%) and
            slippage ({(experiment.assumptions.slippage * 100).toFixed(2)}%) are illustrative
            prototype assumptions, not calibrated execution cost estimates.
          </p>
        </div>
      </div>

      {/* Zero-trade case */}
      {results.tradeCount === 0 ? (
        <>
          <ZeroTradeResult />
          {/* Still fetch explanation so AI can comment on the zero-trade outcome */}
          {loadingExplanation && (
            <div className="border border-zinc-200 rounded-lg p-4">
              <LoadingSpinner label="Interpreting results…" />
            </div>
          )}
          {explanationError && (
            <ErrorMessage message={explanationError} onDismiss={() => setExplanationError(null)} />
          )}
          {conclusion && <ExplanationCards conclusion={conclusion} />}
        </>
      ) : (
        <>
          {/* Primary metric */}
          <MetricCard
            label="Average return per trade (synthetic demo)"
            value={pct(results.averageReturn)}
            sub={`After illustrative costs: ${(experiment.assumptions.transactionCost * 100).toFixed(2)}% tx + ${(experiment.assumptions.slippage * 100).toFixed(2)}% slippage (round-trip)`}
            large
          />

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard label="Signals" value={results.tradeCount.toString()} />
            <MetricCard label="Win rate" value={pct(results.winRate, 1)} />
            <MetricCard label="Median return" value={pct(results.medianReturn)} />
            <MetricCard label="Best trade" value={pct(results.bestTrade)} />
            <MetricCard label="Worst trade" value={pct(results.worstTrade)} />
            <MetricCard
              label="Cumulative"
              value={pct(results.cumulativeReturn, 1)}
              sub="Non-overlapping, compounded"
            />
          </div>

          {/* Chart */}
          <CumulativeChart trades={results.trades} />

          {/* AI Explanation */}
          {loadingExplanation && (
            <div className="border border-zinc-200 rounded-lg p-4">
              <LoadingSpinner label="Interpreting results…" />
            </div>
          )}
          {explanationError && (
            <ErrorMessage message={explanationError} onDismiss={() => setExplanationError(null)} />
          )}
          {conclusion && <ExplanationCards conclusion={conclusion} />}
        </>
      )}
    </section>
  );
}

/** The four explanation cards: data shows / might mean / conclude / limitations */
function ExplanationCards({ conclusion }: { conclusion: ResearchConclusion }) {
  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            What the data shows
          </p>
          <p className="text-xs text-zinc-400">Factual — derived from deterministic backtest numbers</p>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-800">{conclusion.dataSummary}</p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            What this might mean
          </p>
          <p className="text-xs text-zinc-400">AI interpretation — treat with caution</p>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-800">{conclusion.interpretation}</p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            What we can reasonably conclude
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-800">{conclusion.conclusion}</p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Limitations
          </p>
        </div>
        <ul className="p-4 space-y-1.5">
          {conclusion.limitations.map((lim, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
              <span className="text-zinc-400 mt-0.5 flex-shrink-0">•</span>
              <span>{lim}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
