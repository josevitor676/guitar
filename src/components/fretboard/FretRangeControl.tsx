interface FretRangeControlProps {
  minFret: number;
  maxFret: number;
  onChange: (minFret: number, maxFret: number) => void;
}

export function FretRangeControl({ minFret, maxFret, onChange }: FretRangeControlProps) {
  const span = maxFret - minFret;

  const goToPrevious = () => {
    const nextMin = Math.max(1, minFret - 1);
    onChange(nextMin, nextMin + span);
  };

  const goToNext = () => {
    onChange(minFret + 1, maxFret + 1);
  };

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-300">
      <button type="button" onClick={goToPrevious} className="rounded bg-neutral-800 px-2 py-1">
        Anterior
      </button>
      <span>
        Casas {minFret}-{maxFret}
      </span>
      <button type="button" onClick={goToNext} className="rounded bg-neutral-800 px-2 py-1">
        Próximo
      </button>
    </div>
  );
}
