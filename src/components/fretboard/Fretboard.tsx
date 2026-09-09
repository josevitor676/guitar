import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';
import { LABEL_WIDTH_PX, FRET_CELL_WIDTH_PX, ROW_HEIGHT_PX } from './fretboard-layout';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];
const INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
/** The octave frets carry two dots on a real neck, which is how players find them. */
const DOUBLE_INLAY_FRETS = new Set([12, 24]);

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;
  const gridHeightPx = STRING_ORDER.length * ROW_HEIGHT_PX;

  return (
    <div className="relative inline-block">
      <div className="flex items-center border-b border-white/[0.06] pb-1 text-xs text-text-secondary">
        <span className="w-10" />
        {frets.map((fret) => (
          <span key={fret} data-testid={`fret-number-${fret}`} className="flex w-14 items-center justify-center">
            {fret}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {frets.map((fret, index) => {
            const isDouble = DOUBLE_INLAY_FRETS.has(fret);
            if (!isDouble && !INLAY_FRETS.has(fret)) return null;

            return (
              <span
                key={`inlay-${fret}`}
                data-testid={`inlay-fret-${fret}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8"
                style={{
                  left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px`,
                  top: `${gridHeightPx / 2}px`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                {isDouble && <span className="h-2.5 w-2.5 rounded-full bg-white/10" />}
              </span>
            );
          })}
        </div>

        <div className="relative z-10">
          {STRING_ORDER.map((string) => (
            <div key={string} className="relative flex items-center" style={{ height: `${ROW_HEIGHT_PX}px` }}>
              <span
                data-testid={`string-line-${string}`}
                aria-hidden="true"
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]"
              />
              <span className="relative z-10 w-10 text-center text-sm text-text-secondary">
                {getPitchClass(STANDARD_TUNING[string])}
              </span>
              {frets.map((fret) => {
                const position = { string, fret };
                const selected = selectedNotes.some((note) => positionsEqual(note, position));
                const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
                const note = getNoteAt(STANDARD_TUNING, position);
                return (
                  <div key={fret} className="relative z-10 border-r border-white/[0.06]">
                    <FretMarker
                      string={string}
                      fret={fret}
                      selected={selected}
                      highlighted={highlighted}
                      noteLabel={note.pitchClass}
                      onClick={() => toggleNote(position)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
