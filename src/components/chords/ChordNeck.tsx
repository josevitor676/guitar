import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { isSounding } from '../../domain/chords/chord-voicing';
import type { ChordVoicing } from '../../domain/chords/chord-voicing';

const ROW_HEIGHT = 44;
const CELL_WIDTH = 52;
const LABEL_WIDTH = 34;
const OPEN_WIDTH = 40;
const FRETS = Array.from({ length: 12 }, (_, index) => index + 1);
const INLAY_FRETS = new Set([3, 5, 7, 9]);
/**
 * Top to bottom as every other neck in the app draws it: the thin E on top.
 * The domain lists strings the other way, lowest in pitch first, because that
 * is what "the bass note" means — but the two orders are different jobs.
 */
const DISPLAY_STRINGS: StringNumber[] = [1, 2, 3, 4, 5, 6];

interface ChordNeckProps {
  voicing: ChordVoicing;
  onToggleFret: (string: StringNumber, fret: number) => void;
  onToggleOpen: (string: StringNumber) => void;
}

/** The neck the student builds a chord on: one note per string, plus open and muted. */
export function ChordNeck({ voicing, onToggleFret, onToggleOpen }: ChordNeckProps) {
  const gridHeight = DISPLAY_STRINGS.length * ROW_HEIGHT;

  return (
    <div className="subtle-scroll overflow-x-auto pb-2">
      <div className="relative" style={{ width: `${LABEL_WIDTH + OPEN_WIDTH + FRETS.length * CELL_WIDTH}px` }}>
        <div className="mb-1 flex text-xs text-text-secondary">
          <span style={{ width: `${LABEL_WIDTH + OPEN_WIDTH}px` }} />
          {FRETS.map((fret) => (
            <span key={fret} className="text-center" style={{ width: `${CELL_WIDTH}px` }}>
              {fret}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height: `${gridHeight}px` }}>
          {FRETS.map((fret, index) => (
            <span
              key={`fret-${fret}`}
              aria-hidden="true"
              data-testid={INLAY_FRETS.has(fret) ? `chord-inlay-${fret}` : undefined}
              className={`absolute top-0 w-px ${index === 0 ? 'bg-white/25' : 'bg-white/[0.08]'}`}
              style={{ left: `${LABEL_WIDTH + OPEN_WIDTH + index * CELL_WIDTH}px`, height: `${gridHeight}px` }}
            />
          ))}

          {DISPLAY_STRINGS.map((string, row) => {
            const play = voicing[string];

            return (
              <div key={string} className="absolute inset-x-0 flex items-center" style={{ top: `${row * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}>
                <span className="w-[34px] text-center text-sm text-text-secondary">
                  {getPitchClass(STANDARD_TUNING[string])}
                </span>

                <button
                  type="button"
                  aria-label={`corda ${string}: ${play === 'muted' ? 'abafada' : play === 0 ? 'solta' : `casa ${play}`}`}
                  onClick={() => onToggleOpen(string)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all duration-200 ${
                    play === 0
                      ? 'border-accent text-accent'
                      : play === 'muted'
                        ? 'border-white/20 text-text-secondary'
                        : 'border-transparent text-text-secondary/50'
                  }`}
                >
                  {play === 0 ? '○' : '✕'}
                </button>

                <span aria-hidden="true" className="absolute left-[74px] right-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.08]" />

                {FRETS.map((fret) => {
                  const chosen = isSounding(play) && play === fret;
                  const note = getNoteAt(STANDARD_TUNING, { string, fret });

                  return (
                    <button
                      key={fret}
                      type="button"
                      aria-label={`corda ${string}, casa ${fret}`}
                      aria-pressed={chosen}
                      onClick={() => onToggleFret(string, fret)}
                      className="group absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                      style={{
                        left: `${LABEL_WIDTH + OPEN_WIDTH + (fret - 1) * CELL_WIDTH + CELL_WIDTH / 2}px`,
                        top: `${ROW_HEIGHT / 2}px`,
                      }}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-200 ${
                          chosen
                            ? 'bg-accent text-body'
                            : 'border border-transparent text-transparent group-hover:border-white/20'
                        }`}
                      >
                        {note.pitchClass}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {FRETS.filter((fret) => INLAY_FRETS.has(fret)).map((fret) => (
            <span
              key={`inlay-${fret}`}
              aria-hidden="true"
              className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-white/10"
              style={{ left: `${LABEL_WIDTH + OPEN_WIDTH + (fret - 1) * CELL_WIDTH + CELL_WIDTH / 2}px`, top: `${gridHeight - 6}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
