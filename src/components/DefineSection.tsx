"use client";

import { useState } from "react";
import type { Experiment } from "@/src/types/experiment";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";

interface DefineSectionProps {
  experiment: Experiment;
  onRunBacktest: (results: unknown) => void;
}

function AssumptionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs text-amber-700">
      {children}
    </span>
  );
}

export function DefineSection({ experiment: initialExperiment, onRunBacktest }: DefineSectionProps) {
  const [experiment, setExperiment] = useState<Experiment>(initialExperiment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable assumptions
  const [txCostPct, setTxCostPct] = useState(
    (initialExperiment.assumptions.transactionCost * 100).toFixed(2)
  );
  const [slippagePct, setSlippagePct] = useState(
    (initialExperiment.assumptions.slippage * 100).toFixed(2)
  );
  const [startDate, setStartDate] = useState(initialExperiment.testPeriod.start);
  const [endDate, setEndDate] = useState(initialExperiment.testPeriod.end);

  function getUpdatedExperiment(): Experiment {
    return {
      ...experiment,
      testPeriod: { start: startDate, end: endDate },
      assumptions: {
        transactionCost: parseFloat(txCostPct) / 100 || 0.001,
        slippage: parseFloat(slippagePct) / 100 || 0.0005,
      },
    };
  }

  async function handleRunBacktest() {
    setLoading(true);
    setError(null);

    const updatedExperiment = getUpdatedExperiment();
    setExperiment(updatedExperiment);

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExperiment),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Backtest failed.");
        return;
      }

      onRunBacktest(data);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  const holdingStr =
    experiment.holdingPeriod.unit === "weeks"
      ? `${experiment.holdingPeriod.value} week${experiment.holdingPeriod.value !== 1 ? "s" : ""}`
      : `${experiment.holdingPeriod.value} trading day${experiment.holdingPeriod.value !== 1 ? "s" : ""}`;

  return (
    <section aria-labelledby="define-heading" className="space-y-6">
      <div>
        <h2 id="define-heading" className="text-lg font-semibold text-zinc-900">
          Experiment
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Review and adjust before running. Prototype supports daily NIFTY research only.
        </p>
      </div>

      {/* Main experiment card */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Parameters
          </span>
        </div>
        <div className="divide-y divide-zinc-100">
          <Row label="Market">{experiment.instrument}</Row>
          <Row label="Timeframe">
            {experiment.timeframe.charAt(0).toUpperCase() + experiment.timeframe.slice(1)}
          </Row>
          <Row label="Condition">{experiment.entry.condition}</Row>
          <Row label="Entry">{experiment.entry.timing}</Row>
          <Row label="Exit">{experiment.exit.condition}</Row>
          <Row label="Holding period">{holdingStr}</Row>
          <Row label="Success metric">{experiment.successMetric}</Row>
        </div>
      </div>

      {/* Editable assumptions */}
      <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/30">
        <div className="border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Assumptions
          </span>
          <AssumptionTag>Application defaults — not user-provided</AssumptionTag>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="test-start"
                className="block text-xs font-medium text-zinc-600 mb-1"
              >
                Test period start
              </label>
              <input
                id="test-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="test-end"
                className="block text-xs font-medium text-zinc-600 mb-1"
              >
                Test period end
              </label>
              <input
                id="test-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="tx-cost"
                className="block text-xs font-medium text-zinc-600 mb-1"
              >
                Transaction cost (%)
              </label>
              <input
                id="tx-cost"
                type="number"
                min="0"
                max="5"
                step="0.01"
                value={txCostPct}
                onChange={(e) => setTxCostPct(e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="slippage"
                className="block text-xs font-medium text-zinc-600 mb-1"
              >
                Slippage (%)
              </label>
              <input
                id="slippage"
                type="number"
                min="0"
                max="2"
                step="0.01"
                value={slippagePct}
                onChange={(e) => setSlippagePct(e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-amber-700">
            These are illustrative prototype assumptions — not calibrated estimates of actual execution costs.
            The user did not specify them. Adjust before running.
          </p>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="rounded-lg border border-zinc-200 p-4 bg-white">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Hypothesis
        </p>
        <p className="text-sm text-zinc-700 italic">
          &ldquo;{experiment.hypothesis}&rdquo;
        </p>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <button
        type="button"
        onClick={handleRunBacktest}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm
          font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2
          focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      >
        {loading ? <LoadingSpinner label="Running deterministic backtest…" /> : "Run Experiment"}
      </button>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <span className="w-36 flex-shrink-0 text-xs font-medium text-zinc-500 uppercase tracking-wide pt-0.5">
        {label}
      </span>
      <span className="text-sm text-zinc-800">{children}</span>
    </div>
  );
}
