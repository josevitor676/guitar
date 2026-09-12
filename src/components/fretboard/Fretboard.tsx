import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { usePlaybackSequence } from '../../hooks/usePlaybackSequence';
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

/**
 * Toggling treats the neck as a map: a spot is either in the selection or
 * not. Appending treats it as a sequence being played into the timeline, so
 * clicking the same spot twice plays it twice.
 */
export type FretboardMode = 'toggle' | 'append';

interface FretboardProps {
  currentIndex: number | null;
  mode?: FretboardMode;
  /** Positions that fall on a beat head, as "string:fret". Empty unless the metronome is armed. */
  beatHeadKeys?: ReadonlySet<string>;
}

const NO_BEAT_HEADS: ReadonlySet<string> = new Set();

export function Fretboard({
  currentIndex,
  mode = 'toggle',
  beatHeadKeys = NO_BEAT_HEADS,
}: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote, appendNote } = useFretboardSelection();
  const markNote = mode === 'append' ? appendNote : toggleNote;
  // currentIndex counts through the played order, which is not the order the
  // notes were marked in.
  const sequence = usePlaybackSequence();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  /**
   * The open string sits outside the window and never scrolls with it: it is
   * not a fret, it is the string sounding at its own pitch, and it is always
   * within reach whatever position the hand is in.
   */
  const OPEN_FRET = 0;
  /**
   * Where a fret sits among the cells that are drawn. The open string is cell
   * zero, so every fret is one cell further along than its place in the list
   * of frets — which is what the position markers have to follow too.
   */
  const cellIndexOf = (fret: number) => fret - minFret + 1;
  const highlightedPosition = currentIndex !== null ? sequence[currentIndex] : undefined;
  const gridHeightPx = STRING_ORDER.length * ROW_HEIGHT_PX;

  return (
    <div className="relative inline-block">
      <div className="flex items-center border-b border-edge pb-1 text-xs text-text-secondary">
        <span className="w-10" />
        <span data-testid="fret-number-0" className="flex w-14 items-center justify-center">
          0
        </span>
        {frets.map((fret) => (
          <span key={fret} data-testid={`fret-number-${fret}`} className="flex w-14 items-center justify-center">
            {fret}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {frets.map((fret) => {
            const isDouble = DOUBLE_INLAY_FRETS.has(fret);
            if (!isDouble && !INLAY_FRETS.has(fret)) return null;

            return (
              <span
                key={`inlay-${fret}`}
                data-testid={`inlay-fret-${fret}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8"
                style={{
                  left: `${LABEL_WIDTH_PX + cellIndexOf(fret) * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px`,
                  top: `${gridHeightPx / 2}px`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-edge-soft" />
                {isDouble && <span className="h-2.5 w-2.5 rounded-full bg-edge-soft" />}
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
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge"
              />
              <span className="relative z-10 w-10 text-center text-sm text-text-secondary">
                {getPitchClass(STANDARD_TUNING[string])}
              </span>
              {[OPEN_FRET, ...frets].map((fret) => {
                const position = { string, fret };
                const timesPlayed = selectedNotes.filter((note) =>
                  positionsEqual(note, position),
                ).length;
                const selected = timesPlayed > 0;
                const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
                const note = getNoteAt(STANDARD_TUNING, position);
                return (
                  <div
                    key={fret}
                    // The width is set here so the fret wire is drawn *inside*
                    // the cell. Left to the border to add its own pixel, every
                    // cell would be a pixel wider than the constant says, and
                    // the neck would drift a pixel further from the markers
                    // with each fret.
                    style={{ width: `${FRET_CELL_WIDTH_PX}px` }}
                    className={`relative z-10 border-r ${fret === OPEN_FRET ? 'border-edge-strong' : 'border-edge'}`}
                  >
                    <FretMarker
                      string={string}
                      fret={fret}
                      selected={selected}
                      highlighted={highlighted}
                      onBeatHead={beatHeadKeys.has(`${string}:${fret}`)}
                      noteLabel={note.pitchClass}
                      repeatCount={timesPlayed}
                      onClick={() => markNote(position)}
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
