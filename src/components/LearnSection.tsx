"use client";

import type { ResearchConclusion } from "@/src/types/experiment";

interface LearnSectionProps {
  conclusion: ResearchConclusion;
  onNewQuestion: (question: string) => void;
}

export function LearnSection({ conclusion, onNewQuestion }: LearnSectionProps) {
  if (!conclusion.nextQuestions || conclusion.nextQuestions.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="learn-heading" className="space-y-4">
      <div>
        <h2 id="learn-heading" className="text-lg font-semibold text-zinc-900">
          What should we investigate next?
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Click a question to start a new experiment.
        </p>
      </div>

      <ul className="space-y-2" role="list">
        {conclusion.nextQuestions.map((q, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onNewQuestion(q)}
              className="w-full text-left rounded-lg border border-zinc-200 px-4 py-3
                bg-white hover:bg-zinc-50 hover:border-zinc-400 transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-400 group"
            >
              <span className="flex items-start gap-3">
                <span className="text-zinc-300 mt-0.5 flex-shrink-0 text-sm group-hover:text-zinc-500">
                  →
                </span>
                <span className="text-sm text-zinc-700 group-hover:text-zinc-900">
                  {q}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
