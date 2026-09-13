interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Loading…" }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span
        className="inline-block w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}
