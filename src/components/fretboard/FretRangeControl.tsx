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
    <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-zinc-300">
      <button
        type="button"
        onClick={goToPrevious}
        className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        Anterior
      </button>
      <span>
        Casas {minFret}-{maxFret}
      </span>
      <button
        type="button"
        onClick={goToNext}
        className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        Próximo
      </button>
    </div>
  );
}
