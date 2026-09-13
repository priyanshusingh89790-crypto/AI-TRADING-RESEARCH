"use client";

type Step = "ask" | "clarify" | "define" | "test" | "learn";

interface StepIndicatorProps {
  currentStep: Step;
}

const steps: { id: Step; label: string }[] = [
  { id: "ask", label: "ASK" },
  { id: "clarify", label: "CLARIFY" },
  { id: "define", label: "DEFINE" },
  { id: "test", label: "TEST" },
  { id: "learn", label: "LEARN" },
];

const stepOrder: Record<Step, number> = {
  ask: 0,
  clarify: 1,
  define: 2,
  test: 3,
  learn: 4,
};

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIdx = stepOrder[currentStep];

  return (
    <nav aria-label="Research workflow steps">
      <ol className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <li key={step.id} className="flex items-center">
              <span
                className={[
                  "px-3 py-1 text-xs font-semibold tracking-widest rounded",
                  isActive
                    ? "bg-zinc-900 text-white"
                    : isCompleted
                    ? "text-zinc-400"
                    : "text-zinc-300",
                ].join(" ")}
                aria-current={isActive ? "step" : undefined}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <span
                  className={`mx-1 text-xs ${
                    isCompleted ? "text-zinc-400" : "text-zinc-200"
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
