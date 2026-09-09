import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function Chip({ children, active = false, className = '' }: ChipProps) {
  return (
    <span
      data-active={active}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
        active
          ? 'border-accent/40 bg-accent-dim text-text-primary'
          : 'border-white/[0.06] bg-surface text-text-secondary'
      } ${className}`.trim()}
    >
      {children}
    </span>
  );
}
