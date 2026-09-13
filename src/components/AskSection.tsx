"use client";

import { useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";

interface AskSectionProps {
  onAnalysisComplete: (analysis: unknown, question: string) => void;
  initialQuestion?: string;
}

export function AskSection({ onAnalysisComplete, initialQuestion }: AskSectionProps) {
  const [question, setQuestion] = useState(
    initialQuestion || "Does buying NIFTY after a sharp fall work?"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to analyze question.");
        return;
      }

      onAnalysisComplete(data, question.trim());
    } catch {
      setError(
        "Could not connect to the server. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="ask-heading">
      <div className="mb-6">
        <h1
          id="ask-heading"
          className="text-2xl font-semibold text-zinc-900 tracking-tight"
        >
          AI Trading Research Assistant
        </h1>
        <p className="mt-1 text-zinc-500 text-sm">
          Turn a market idea into a testable research experiment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="question-input"
            className="block text-sm font-medium text-zinc-700 mb-1.5"
          >
            Research question
          </label>
          <textarea
            id="question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Does buying NIFTY after a sharp fall work?"
            rows={3}
            disabled={loading}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900
              placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400
              focus:border-transparent resize-none disabled:bg-zinc-50 disabled:text-zinc-400
              transition-colors"
            maxLength={500}
            aria-describedby="question-hint"
          />
          <p id="question-hint" className="mt-1 text-xs text-zinc-400">
            Ask in natural language. The AI will identify what needs clarification.
          </p>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm
            font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2
            focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors"
        >
          {loading ? (
            <LoadingSpinner label="Analyzing question…" />
          ) : (
            "Analyze Question"
          )}
        </button>
      </form>
    </section>
  );
}
