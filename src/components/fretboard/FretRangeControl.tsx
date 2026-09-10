/** The highest fret the window can be scrolled to, matching a 24-fret neck. */
const HIGHEST_FRET = 24;

interface FretRangeControlProps {
  minFret: number;
  maxFret: number;
  onChange: (minFret: number, maxFret: number) => void;
}

export function FretRangeControl({ minFret, maxFret, onChange }: FretRangeControlProps) {
  const span = maxFret - minFret;
  // The window keeps its width, so it can only start early enough to still fit.
  const highestStart = Math.max(1, HIGHEST_FRET - span);

  const moveTo = (start: number) => {
    const clamped = Math.min(highestStart, Math.max(1, start));
    onChange(clamped, clamped + span);
  };

  return (
    <div className="flex items-center gap-3 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium">
      <span className="whitespace-nowrap text-text-primary">
        Casas {minFret}-{maxFret}
      </span>
      <input
        type="range"
        min={1}
        max={highestStart}
        value={Math.min(minFret, highestStart)}
        aria-label="Primeira casa visível"
        onChange={(event) => moveTo(Number(event.target.value))}
        className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-edge-soft accent-accent"
      />
    </div>
  );
}
