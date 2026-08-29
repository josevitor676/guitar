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
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs font-medium">
      <button
        type="button"
        onClick={goToPrevious}
        className="text-text-secondary transition-all duration-200 hover:text-text-primary"
      >
        Anterior
      </button>
      <span className="text-text-primary">
        Casas {minFret}-{maxFret}
      </span>
      <button
        type="button"
        onClick={goToNext}
        className="text-text-secondary transition-all duration-200 hover:text-text-primary"
      >
        Próximo
      </button>
    </div>
  );
}
