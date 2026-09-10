import type { ReactNode } from 'react';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: IconButtonVariant;
  className?: string;
  disabled?: boolean;
  /** Draws the button as switched on, which swaps the variant rather than layering over it. */
  active?: boolean;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary: 'bg-accent text-body hover:bg-accent-soft',
  secondary: 'bg-surface text-text-primary hover:bg-white/10',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
};

export function IconButton({
  label,
  onClick,
  children,
  variant = 'secondary',
  className = '',
  disabled = false,
  active = false,
}: IconButtonProps) {
  // Passing an override class cannot work: both it and the variant's own
  // background end up in the class list, and which one wins is decided by the
  // order Tailwind emits them, not by the order they are written here.
  const appearance = active ? VARIANT_CLASSES.primary : VARIANT_CLASSES[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${appearance} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
