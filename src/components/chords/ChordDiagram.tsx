import type { ChordVoicing } from '../../domain/chords/chord-voicing';
import { ALL_STRINGS, isSounding, lowestFret } from '../../domain/chords/chord-voicing';
import { fingerChord } from '../../domain/chords/chord-fingering';

// Wider than tall on purpose: the shape has to read as a neck lying down, the
// same way round as every other neck in the app. A near-square box reads as
// neither orientation.
const ROW_HEIGHT = 15;
const CELL_WIDTH = 32;
const FRETS_SHOWN = 4;
const GUTTER = 16;

/**
 * One chord shape, read the same way round as the rest of the app: strings in
 * rows, frets across. The reference this was drawn from stands the neck up, but
 * two orientations in one product means relearning the picture on every tab.
 */
export function ChordDiagram({ voicing, showFingers = true }: { voicing: ChordVoicing; showFingers?: boolean }) {
  const { fingers, barre } = fingerChord(voicing);
  const fingerFor = new Map(fingers.map((placement) => [placement.string, placement.finger]));
  const lowest = lowestFret(voicing);
  // An open shape is read from the nut; anything else from where the hand sits.
  const startFret = lowest === null || lowest <= FRETS_SHOWN ? 1 : lowest;
  const frets = Array.from({ length: FRETS_SHOWN }, (_, index) => startFret + index);

  return (
    <div className="flex items-center gap-1">
      <span className="w-4 shrink-0 text-right text-[10px] text-text-secondary">
        {startFret > 1 ? startFret : ''}
      </span>

      <div className="relative" style={{ height: `${ALL_STRINGS.length * ROW_HEIGHT}px` }}>
        <div className="flex">
          <div className="flex flex-col" style={{ width: `${GUTTER}px` }}>
            {ALL_STRINGS.map((string) => (
              <span
                key={string}
                data-testid={`diagram-open-${string}`}
                className="flex items-center justify-center text-[9px] text-text-secondary"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {voicing[string] === 'muted' ? '✕' : voicing[string] === 0 ? '○' : ''}
              </span>
            ))}
          </div>

          <div className="relative">
            {ALL_STRINGS.map((string) => (
              <div
                key={string}
                className="relative flex items-center border-white/[0.06]"
                style={{ height: `${ROW_HEIGHT}px`, width: `${frets.length * CELL_WIDTH}px` }}
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20" />
              </div>
            ))}

            {frets.map((fret, index) => (
              <span
                key={fret}
                aria-hidden="true"
                className={`absolute top-0 ${
                  index === 0 && startFret === 1 ? 'w-[2px] bg-white/50' : 'w-px bg-white/10'
                }`}
                style={{ left: `${index * CELL_WIDTH}px`, height: `${ALL_STRINGS.length * ROW_HEIGHT}px` }}
              />
            ))}

            {/* One finger laid across several strings is a bar, not a row of
                separate dots, and it has to be drawn as the one thing it is. */}
            {barre && frets.includes(barre.fret) && (
              <span
                data-testid="diagram-barre"
                className="absolute -translate-x-1/2 rounded-full bg-accent"
                style={{
                  left: `${frets.indexOf(barre.fret) * CELL_WIDTH + CELL_WIDTH / 2}px`,
                  top: `${ALL_STRINGS.indexOf(barre.fromString) * ROW_HEIGHT + ROW_HEIGHT / 2 - 5}px`,
                  width: '10px',
                  height: `${(ALL_STRINGS.indexOf(barre.toString) - ALL_STRINGS.indexOf(barre.fromString)) * ROW_HEIGHT + 10}px`,
                }}
              />
            )}

            {ALL_STRINGS.map((string, row) => {
              const play = voicing[string];
              if (!isSounding(play) || play === 0) return null;
              const column = frets.indexOf(play);
              if (column === -1) return null;
              // The bar already covers this string at this fret.
              if (barre && play === barre.fret) return null;

              return (
                <span
                  key={string}
                  data-testid={`diagram-dot-${string}`}
                  className="absolute flex h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-[8px] font-bold leading-none text-body"
                  style={{
                    left: `${column * CELL_WIDTH + CELL_WIDTH / 2}px`,
                    top: `${row * ROW_HEIGHT + ROW_HEIGHT / 2}px`,
                  }}
                >
                  {showFingers ? (fingerFor.get(string) ?? '') : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
