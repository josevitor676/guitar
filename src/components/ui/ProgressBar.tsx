interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-1 w-full overflow-hidden rounded-full bg-accent-dim"
    >
      <div className="h-full rounded-full bg-accent transition-all duration-200" style={{ width: `${percent}%` }} />
    </div>
  );
}
