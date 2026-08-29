import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

const STRING_LINE_HEIGHT: Record<StringNumber, string> = {
  1: 'h-[1px]',
  2: 'h-[1.4px]',
  3: 'h-[1.8px]',
  4: 'h-[2.2px]',
  5: 'h-[2.6px]',
  6: 'h-[3px]',
};

const INLAY_FRETS = new Set([3, 5, 7]);
const LABEL_WIDTH_PX = 40;
const FRET_CELL_WIDTH_PX = 56;
const ROW_HEIGHT_PX = 48;

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;

  return (
    <div className="relative inline-block border-l-4 border-zinc-300 bg-gradient-to-b from-[#2b1d14] to-[#1a120c]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {frets.map((fret, index) =>
          INLAY_FRETS.has(fret) ? (
            <span
              key={`inlay-${fret}`}
              data-testid={`inlay-fret-${fret}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100/10"
              style={{ left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px` }}
            />
          ) : null,
        )}
        {frets.map((fret, index) => (
          <span
            key={`fret-line-${fret}`}
            data-testid={`fret-line-${fret}`}
            className="absolute top-0 bottom-0 w-px bg-zinc-400/50"
            style={{ left: `${LABEL_WIDTH_PX + (index + 1) * FRET_CELL_WIDTH_PX}px` }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {STRING_ORDER.map((string) => (
          <div key={string} className="relative flex items-center" style={{ height: `${ROW_HEIGHT_PX}px` }}>
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-1/2 -translate-y-1/2 bg-zinc-300/70 ${STRING_LINE_HEIGHT[string]}`}
            />
            <span className="relative z-10 w-10 text-center text-sm text-zinc-400">
              {getPitchClass(STANDARD_TUNING[string])}
            </span>
            {frets.map((fret) => {
              const position = { string, fret };
              const selected = selectedNotes.some((note) => positionsEqual(note, position));
              const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
              const note = getNoteAt(STANDARD_TUNING, position);
              return (
                <FretMarker
                  key={fret}
                  string={string}
                  fret={fret}
                  selected={selected}
                  highlighted={highlighted}
                  noteLabel={note.pitchClass}
                  onClick={() => toggleNote(position)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
