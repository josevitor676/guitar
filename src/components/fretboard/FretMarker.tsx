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
    ? 'bg-amber-300 text-zinc-900 ring-2 ring-amber-200/70 shadow-[0_0_10px_rgba(252,211,77,0.8)]'
    : selected
      ? 'bg-amber-400 text-zinc-900 ring-2 ring-amber-300/50 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
      : 'bg-transparent text-transparent group-hover:bg-zinc-100/10';

  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className="group relative z-10 flex h-12 w-14 items-center justify-center transition-all duration-200"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${circleClasses}`}
      >
        {selected ? noteLabel : ''}
      </span>
    </button>
  );
}
