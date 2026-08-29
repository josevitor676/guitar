interface FretMarkerProps {
  string: number;
  fret: number;
  selected: boolean;
  highlighted: boolean;
  noteLabel: string;
  onClick: () => void;
}

export function FretMarker({ string, fret, selected, highlighted, noteLabel, onClick }: FretMarkerProps) {
  const circleClasses = highlighted
    ? 'border border-accent bg-accent text-body'
    : selected
      ? 'border border-white/40 text-text-primary'
      : 'border border-transparent text-transparent group-hover:border-white/20';

  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className="group flex h-12 w-14 items-center justify-center transition-all duration-200"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-200 ${circleClasses}`}
      >
        {selected ? noteLabel : ''}
      </span>
    </button>
  );
}
