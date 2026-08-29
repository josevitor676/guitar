interface FretMarkerProps {
  string: number;
  fret: number;
  selected: boolean;
  highlighted: boolean;
  noteLabel: string;
  onClick: () => void;
}

export function FretMarker({ string, fret, selected, highlighted, noteLabel, onClick }: FretMarkerProps) {
  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'flex h-10 w-14 items-center justify-center border-r border-zinc-400/60 text-xs font-medium transition-colors',
        highlighted ? 'bg-amber-400 text-neutral-900' : selected ? 'bg-neutral-300 text-neutral-900' : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800',
      ].join(' ')}
    >
      {selected ? noteLabel : ''}
    </button>
  );
}
