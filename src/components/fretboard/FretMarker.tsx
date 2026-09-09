interface FretMarkerProps {
  string: number;
  fret: number;
  selected: boolean;
  highlighted: boolean;
  onBeatHead?: boolean;
  noteLabel: string;
  onClick: () => void;
}

export function FretMarker({
  string,
  fret,
  selected,
  highlighted,
  noteLabel,
  onClick,
  onBeatHead = false,
}: FretMarkerProps) {
  // On a beat head the note is filled solid white against the accent ring, so
  // it reads apart from the ordinary highlight at a glance.
  const circleClasses = highlighted
    ? onBeatHead
      ? 'bg-text-primary text-body ring-4 ring-accent'
      : 'bg-accent text-body ring-4 ring-accent-dim'
    : selected
      ? 'border border-white/20 bg-body text-text-primary'
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
