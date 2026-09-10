/**
 * A metronome: the tapered case with its pendulum leaning off centre.
 *
 * Drawn here rather than taken from the icon set, which has no metronome — a
 * clock or a speaker would both say the wrong thing about what this button does.
 */
export function MetronomeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M9 3h6l3.5 18h-13z" strokeLinejoin="round" />
      <path d="M7.2 15h9.6" strokeLinecap="round" />
      <path d="M15.5 6.5 10 15" strokeLinecap="round" />
    </svg>
  );
}
