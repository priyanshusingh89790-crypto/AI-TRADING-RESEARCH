"use client";

import { useState } from "react";
import type { ResearchAnalysis, Clarification } from "@/src/types/experiment";
import { FieldBadge } from "./FieldBadge";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";

interface ClarifySectionProps {
  question: string;
  analysis: ResearchAnalysis;
  onExperimentBuilt: (experiment: unknown) => void;
}

const FIELD_LABELS: Record<string, string> = {
  instrument: "Instrument",
  timeframe: "Timeframe",
  entryCondition: "Entry condition",
  entryTiming: "Entry timing",
  exitCondition: "Exit condition",
  holdingPeriod: "Holding period",
  testPeriod: "Test period",
  filters: "Filters",
  successMetric: "Success metric",
};

function ClarificationCard({
  clarification,
  value,
  onChange,
}: {
  clarification: Clarification;
  value: string;
  onChange: (val: string) => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const isCustomSelected = value === "Custom";

  function handleOptionClick(opt: string) {
    if (opt === "Custom") {
      onChange("Custom");
    } else {
      onChange(opt);
      setCustomValue("");
      setCustomError(null);
    }
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setCustomValue(val);
    setCustomError(null);
    if (val.trim()) {
      onChange(val.trim());
    } else {
      onChange("Custom");
    }
  }

  function handleCustomBlur() {
    if (isCustomSelected && !customValue.trim()) {
      setCustomError("Please enter a custom value.");
    }
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-800">
          {clarification.question}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{clarification.reason}</p>
      </div>

      <fieldset>
        <legend className="sr-only">{clarification.question}</legend>
        <div className="flex flex-wrap gap-2">
          {clarification.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleOptionClick(opt)}
              className={[
                "px-3 py-1.5 rounded-md text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400",
                value === opt || (opt === "Custom" && isCustomSelected)
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400",
              ].join(" ")}
              aria-pressed={value === opt || (opt === "Custom" && isCustomSelected)}
            >
              {opt}
            </button>
          ))}
        </div>
      </fieldset>

      {isCustomSelected && (
        <div>
          <label
            htmlFor={`custom-${clarification.field}`}
            className="block text-xs font-medium text-zinc-600 mb-1"
          >
            Custom value
          </label>
          <input
            id={`custom-${clarification.field}`}
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            onBlur={handleCustomBlur}
            placeholder="Enter your value…"
            className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
            aria-describedby={customError ? `custom-error-${clarification.field}` : undefined}
          />
          {customError && (
            <p
              id={`custom-error-${clarification.field}`}
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {customError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ClarifySection({
  question,
  analysis,
  onExperimentBuilt,
}: ClarifySectionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredClarifications = analysis.clarifications.filter(
    (c) => c.required
  );
  const allAnswered = requiredClarifications.every(
    (c) =>
      answers[c.field] &&
      answers[c.field] !== "Custom"
  );

  async function handleBuildExperiment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalQuestion: question, analysis, userAnswers: answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to build experiment.");
        return;
      }

      onExperimentBuilt(data);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <section aria-labelledby="clarify-heading" className="space-y-6">
      {/* Interpretation */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          I understand the idea
        </p>
        <p className="text-sm text-zinc-800">{analysis.interpretation}</p>
      </div>

      {/* Extracted fields */}
      <div>
        <h2 id="clarify-heading" className="text-sm font-semibold text-zinc-700 mb-3">
          Extracted parameters
        </h2>
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 text-xs uppercase tracking-wide">
                  Parameter
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 text-xs uppercase tracking-wide">
                  Value
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-600 text-xs uppercase tracking-wide">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analysis.fields).map(([key, field]) => (
                <tr key={key} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5 text-zinc-600 font-medium">
                    {FIELD_LABELS[key] ?? key}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-800">
                    {field.value ?? (
                      <span className="text-zinc-400 italic">Not specified</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <FieldBadge status={field.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clarification questions */}
      {analysis.clarifications.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-1">
            Before we test this
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            Answer the following to define a precise experiment.
          </p>
          <div className="space-y-3">
            {analysis.clarifications.map((c) => (
              <ClarificationCard
                key={c.field}
                clarification={c}
                value={answers[c.field] ?? ""}
                onChange={(val) => setAnswer(c.field, val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preliminary hypothesis */}
      <div className="rounded-lg border border-zinc-200 p-4 bg-white">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Preliminary hypothesis
        </p>
        <p className="text-sm text-zinc-700 italic">&ldquo;{analysis.hypothesis}&rdquo;</p>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <button
        type="button"
        onClick={handleBuildExperiment}
        disabled={loading || !allAnswered}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm
          font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2
          focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      >
        {loading ? (
          <LoadingSpinner label="Building experiment…" />
        ) : (
          "Build Experiment"
        )}
      </button>

      {!allAnswered && requiredClarifications.length > 0 && (
        <p className="text-xs text-zinc-400" role="note">
          Please answer all required questions above to continue.
        </p>
      )}
    </section>
  );
}
