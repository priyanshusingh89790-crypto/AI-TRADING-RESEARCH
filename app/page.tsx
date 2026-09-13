"use client";

import { useState } from "react";
import type {
  ResearchAnalysis,
  Experiment,
  BacktestResult,
  ResearchConclusion,
} from "@/src/types/experiment";
import { StepIndicator } from "@/src/components/StepIndicator";
import { AskSection } from "@/src/components/AskSection";
import { ClarifySection } from "@/src/components/ClarifySection";
import { DefineSection } from "@/src/components/DefineSection";
import { ResultsSection } from "@/src/components/ResultsSection";
import { LearnSection } from "@/src/components/LearnSection";

type Step = "ask" | "clarify" | "define" | "test" | "learn";

export default function HomePage() {
  const [step, setStep] = useState<Step>("ask");
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<ResearchAnalysis | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [conclusion, setConclusion] = useState<ResearchConclusion | null>(null);

  function handleAnalysisComplete(rawAnalysis: unknown, q: string) {
    setQuestion(q);
    setAnalysis(rawAnalysis as ResearchAnalysis);
    setExperiment(null);
    setBacktestResults(null);
    setConclusion(null);
    setStep("clarify");
  }

  function handleExperimentBuilt(rawExperiment: unknown) {
    setExperiment(rawExperiment as Experiment);
    setBacktestResults(null);
    setConclusion(null);
    setStep("define");
  }

  function handleBacktestComplete(rawResults: unknown) {
    setBacktestResults(rawResults as BacktestResult);
    setStep("test");
  }

  function handleConclusionReady(rawConclusion: ResearchConclusion) {
    setConclusion(rawConclusion);
    setStep("learn");
  }

  function handleNewQuestion(q: string) {
    // Pre-fill and reset to ask step
    setQuestion(q);
    setAnalysis(null);
    setExperiment(null);
    setBacktestResults(null);
    setConclusion(null);
    setStep("ask");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setQuestion("");
    setAnalysis(null);
    setExperiment(null);
    setBacktestResults(null);
    setConclusion(null);
    setStep("ask");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <StepIndicator currentStep={step} />
          {step !== "ask" && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-300 rounded px-2 py-1"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Step 1: Ask */}
        <AskSection
          key={question} // re-mount when new question from Learn
          initialQuestion={question}
          onAnalysisComplete={handleAnalysisComplete}
        />

        {/* Step 2: Clarify */}
        {analysis && (step === "clarify" || step === "define" || step === "test" || step === "learn") && (
          <div className="border-t border-zinc-100 pt-8">
            {step === "clarify" ? (
              <ClarifySection
                question={question}
                analysis={analysis}
                onExperimentBuilt={handleExperimentBuilt}
              />
            ) : (
              <div className="opacity-50 pointer-events-none">
                <CollapsedStep label="Clarify" summary={question} />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Define */}
        {experiment && (step === "define" || step === "test" || step === "learn") && (
          <div className="border-t border-zinc-100 pt-8">
            {step === "define" ? (
              <DefineSection
                experiment={experiment}
                onRunBacktest={handleBacktestComplete}
              />
            ) : (
              <div className="opacity-50 pointer-events-none">
                <CollapsedStep
                  label="Define"
                  summary={`${experiment.instrument} · ${experiment.entry.condition} · ${experiment.holdingPeriod.value} ${experiment.holdingPeriod.unit}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Test / Results */}
        {backtestResults && experiment && (step === "test" || step === "learn") && (
          <div className="border-t border-zinc-100 pt-8">
            <ResultsSection
              results={backtestResults}
              experiment={experiment}
              onConclusionReady={handleConclusionReady}
            />
          </div>
        )}

        {/* Step 5: Learn */}
        {conclusion && step === "learn" && (
          <div className="border-t border-zinc-100 pt-8">
            <LearnSection
              conclusion={conclusion}
              onNewQuestion={handleNewQuestion}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-zinc-400">
            AI Trading Research Assistant · Internship prototype ·{" "}
            <span className="text-amber-600">
              Uses synthetic demo data, not real market data
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function CollapsedStep({ label, summary }: { label: string; summary: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider w-16">
        {label}
      </span>
      <span className="text-sm text-zinc-400 truncate">{summary}</span>
      <span className="text-zinc-300 ml-auto text-sm">✓</span>
    </div>
  );
}
