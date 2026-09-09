import type { ReactNode } from 'react';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: IconButtonVariant;
  className?: string;
  disabled?: boolean;
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
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
