import type { FieldStatus } from "@/src/types/experiment";

interface FieldBadgeProps {
  status: FieldStatus;
}

const badgeConfig: Record<FieldStatus, { label: string; className: string }> = {
  user_provided: {
    label: "User provided",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  inferred: {
    label: "Inferred",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  missing: {
    label: "Missing",
    className: "bg-red-50 text-red-600 border border-red-200",
  },
};

export function FieldBadge({ status }: FieldBadgeProps) {
  const config = badgeConfig[status];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
