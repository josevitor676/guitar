import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

const STRING_BORDER_WIDTH: Record<StringNumber, string> = {
  1: 'border-b-[1px]',
  2: 'border-b-[1.4px]',
  3: 'border-b-[1.8px]',
  4: 'border-b-[2.2px]',
  5: 'border-b-[2.6px]',
  6: 'border-b-[3px]',
};

const INLAY_FRETS = new Set([3, 5, 7]);
const LABEL_WIDTH_PX = 40;
const FRET_CELL_WIDTH_PX = 56;

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
              key={fret}
              data-testid={`inlay-fret-${fret}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-zinc-100/10"
              style={{ left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px` }}
            />
          ) : null,
        )}
      </div>

      <div className="relative z-10">
        {STRING_ORDER.map((string) => (
          <div key={string} className={`flex items-center border-zinc-300/70 ${STRING_BORDER_WIDTH[string]}`}>
            <span className="w-10 text-center text-sm text-zinc-400">
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
