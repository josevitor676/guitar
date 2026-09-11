import { ROW_HEIGHT_PX, FRET_CELL_WIDTH_PX } from './fretboard-layout';

interface FretMarkerProps {
  string: number;
  fret: number;
  selected: boolean;
  highlighted: boolean;
  onBeatHead?: boolean;
  noteLabel: string;
  /** How many times the sequence plays this spot; only shown above one. */
  repeatCount?: number;
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
  repeatCount = 1,
}: FretMarkerProps) {
  // A note on a beat head is outlined in the accent so the student can see
  // which notes coincide with the click; the note actually sounding is filled.
  const circleClasses = highlighted
    ? 'bg-accent text-body ring-4 ring-accent-dim'
    : selected
      ? onBeatHead
        ? 'border-2 border-accent bg-body text-accent'
        : 'border border-edge-strong bg-body text-text-primary'
      : 'border border-transparent text-transparent group-hover:border-edge-strong';

  return (
    <button
      type="button"
      // The open string is named, not numbered: "casa 0" is not what a player
      // calls it, and the neck has no fret there to point at.
      aria-label={fret === 0 ? `corda ${string}, solta` : `corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      style={{ height: `${ROW_HEIGHT_PX}px`, width: `${FRET_CELL_WIDTH_PX}px` }}
      className="group relative flex items-center justify-center transition-all duration-200"
    >
      {selected && repeatCount > 1 && (
        <span
          data-testid={`repeat-count-${string}-${fret}`}
          title={`tocada ${repeatCount} vezes`}
          className="absolute right-1.5 top-1 z-10 rounded-full bg-accent px-1 text-[9px] font-bold leading-3 text-body"
        >
          {repeatCount}
        </span>
      )}
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-200 ${circleClasses}`}
      >
        {selected ? noteLabel : ''}
      </span>
    </button>
  );
}
