import { useEffect, useRef } from 'react';
import type { TimedNote } from '../../domain/playback/timeline-model';
import { timelineLengthInBeats, isOnBeatHead } from '../../domain/playback/timeline-model';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { ARTICULATION_SHORT_LABEL, ARTICULATION_LABEL } from '../../domain/music-theory/articulation';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];
/**
 * Consecutive notes always sit this far apart, whatever rhythmic figure is
 * chosen. Scaling pixels by beats instead would shrink the whole roll into the
 * left of the card as soon as the figure got shorter — eight notes of
 * semicolcheia occupy a quarter of the width that eight semínimas do, and the
 * roll stopped being readable long before it stopped being correct.
 */
const PX_PER_NOTE = 72;
/** Shorter than the neck's rows: the roll sits under it, and both have to fit. */
const ROW_HEIGHT_PX = 28;
/** Wide enough that the first note, which sits at beat zero, clears the string label. */
const LABEL_WIDTH_PX = 60;
const TRAILING_BEATS = 2;
/** Beats per bar, which is where the heavier divider falls. */
const BEATS_PER_BAR = 4;
const SCROLL_MARGIN_PX = 120;

interface TimelineRollProps {
  timeline: TimedNote[];
  currentIndex: number | null;
  /** While the metronome leads, notes on a beat head are marked out. */
  metronomeOn?: boolean;
  /**
   * Removes one note by its place in the sequence. It has to be the index:
   * a riff plays the same string and fret over and over, so naming the spot
   * would not say which of them the student meant. Left out, the roll is
   * read-only.
   */
  onRemoveNote?: (index: number) => void;
}



export function TimelineRoll({
  timeline,
  currentIndex,
  metronomeOn = false,
  onRemoveNote,
}: TimelineRollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Beats are converted through the gap between notes, so the layout keeps its
  // density while bar boundaries still land on the right beats.
  const beatStep = timeline.length > 1 ? timeline[1].startBeat - timeline[0].startBeat : 1;
  const pxPerBeat = PX_PER_NOTE / Math.max(beatStep, 1e-6);
  const beatToX = (beat: number) => LABEL_WIDTH_PX + beat * pxPerBeat;
  const activeNote = currentIndex !== null ? timeline[currentIndex] : undefined;
  const playheadX = beatToX(activeNote ? activeNote.startBeat : 0);
  const lengthInBeats = timelineLengthInBeats(timeline);
  const widthPx = beatToX(lengthInBeats + TRAILING_BEATS * beatStep);
  const gridHeightPx = STRING_ORDER.length * ROW_HEIGHT_PX;
  // A slur label sits 40px above its note, which on the first string is above
  // the grid. Only a sequence that has one needs the room reserved.
  const hasSlurs = timeline.some((note) => !!note.position.articulation);

  // Dividers fall *between* notes, not through them, so each note sits inside
  // its own cell exactly as it sits between two frets on the neck. Boundary k
  // is the one just before note k, and it opens a bar when that note lands on
  // a downbeat.
  const cellBoundaries = Array.from({ length: timeline.length + 1 }, (_, index) => ({
    index,
    beat: index * beatStep - beatStep / 2,
    opensBar: Math.abs((index * beatStep) % BEATS_PER_BAR) < 1e-6,
  }));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;

    const beforeView = playheadX < container.scrollLeft + SCROLL_MARGIN_PX;
    const afterView = playheadX > container.scrollLeft + container.clientWidth - SCROLL_MARGIN_PX;
    if (beforeView || afterView) {
      container.scrollTo({ left: Math.max(0, playheadX - SCROLL_MARGIN_PX), behavior: 'smooth' });
    }
  }, [playheadX]);

  if (timeline.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
        Monte uma sequência no braço para vê-la aqui.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`subtle-scroll relative overflow-x-auto overflow-y-hidden ${hasSlurs ? 'pt-11' : 'pt-3'}`}
    >
      <div className="relative" style={{ width: `${widthPx}px`, height: `${gridHeightPx}px` }}>
        {/*
          One divider per beat, so the roll reads in columns the way tablature
          does, with a heavier line opening each bar to make the pulse countable.
        */}
        {cellBoundaries.map(({ index, beat, opensBar }) => (
          <span
            key={`divider-${index}`}
            data-testid={`timeline-divider-${index}`}
            data-bar={opensBar}
            aria-hidden="true"
            className={`absolute top-0 w-px ${opensBar ? 'bg-edge-strong' : 'bg-edge'}`}
            style={{ left: `${beatToX(beat)}px`, height: `${gridHeightPx}px` }}
          />
        ))}

        {/*
          Slurs are drawn under the notes: an arc from the note before to the
          note reached, carrying the letter tablature already prints.
        */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width={widthPx}
          height={gridHeightPx}
        >
          <defs>
            <marker id="timeline-bend-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="currentColor" className="text-accent" />
            </marker>
          </defs>

          {timeline.map((note) => {
            const previous = timeline[note.index - 1];
            const articulation = note.position.articulation;
            if (!articulation || !previous) return null;

            const fromX = beatToX(previous.startBeat);
            const toX = beatToX(note.startBeat);
            const fromRow = STRING_ORDER.indexOf(previous.position.string) * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
            const rowY = STRING_ORDER.indexOf(note.position.string) * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
            const arcY = rowY - 22;

            // Each technique draws the shape tablature already uses for it: a
            // slur over the two notes, a straight line for a slide, an arrow
            // for a bend rising to its target.
            const shape =
              articulation === 'slide'
                ? `M ${fromX + 16} ${fromRow + 8} L ${toX - 16} ${rowY - 8}`
                : articulation === 'bend'
                  ? `M ${fromX + 14} ${arcY + 10} C ${fromX + 40} ${arcY + 10} ${toX - 22} ${arcY} ${toX - 14} ${arcY - 2}`
                  : `M ${fromX + 14} ${arcY} Q ${(fromX + toX) / 2} ${arcY - 14} ${toX - 14} ${arcY}`;

            return (
              <path
                key={`slur-${note.index}`}
                data-testid={`timeline-slur-${note.index}`}
                data-articulation={articulation}
                d={shape}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                markerEnd={articulation === 'bend' ? 'url(#timeline-bend-arrow)' : undefined}
                className="text-accent"
              />
            );
          })}
        </svg>

        {timeline.map((note) => {
          const previous = timeline[note.index - 1];
          if (!note.position.articulation || !previous) return null;

          const midX = (beatToX(previous.startBeat) + beatToX(note.startBeat)) / 2;
          const rowY = STRING_ORDER.indexOf(note.position.string) * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;

          return (
            <span
              key={`slur-label-${note.index}`}
              data-testid={`timeline-slur-label-${note.index}`}
              title={ARTICULATION_LABEL[note.position.articulation]}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-1.5 text-[10px] font-bold leading-4 text-body"
              style={{ left: `${midX}px`, top: `${rowY - 40}px` }}
            >
              {ARTICULATION_SHORT_LABEL[note.position.articulation]}
            </span>
          );
        })}

        {STRING_ORDER.map((string) => (
          <div
            key={string}
            data-testid={`timeline-string-row-${string}`}
            className="relative flex items-center"
            style={{ height: `${ROW_HEIGHT_PX}px` }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge" />
            <span className="relative z-10 w-10 text-center text-sm text-text-secondary">
              {getPitchClass(STANDARD_TUNING[string])}
            </span>
          </div>
        ))}

        <div
          data-testid="timeline-playhead"
          aria-hidden="true"
          className="absolute top-0 z-20 w-0.5 -translate-x-1/2 bg-accent transition-all duration-100"
          style={{ left: `${playheadX}px`, height: `${gridHeightPx}px` }}
        >
          <span className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-b-[6px] border-x-transparent border-b-accent" />
        </div>

        {timeline.map((note) => {
          const rowIndex = STRING_ORDER.indexOf(note.position.string);
          const active = currentIndex === note.index;
          const onBeatHead = metronomeOn && isOnBeatHead(note);
          const pitch = getNoteAt(STANDARD_TUNING, note.position).pitchClass;

          const removable = !!onRemoveNote;
          const Wrapper = removable ? 'button' : 'div';

          return (
            <Wrapper
              key={note.index}
              type={removable ? 'button' : undefined}
              aria-label={
                removable
                  ? `remover nota ${note.index + 1}: corda ${note.position.string}, casa ${note.position.fret}`
                  : undefined
              }
              onClick={removable ? () => onRemoveNote(note.index) : undefined}
              data-testid={`timeline-note-${note.index}`}
              data-string={note.position.string}
              data-active={active}
              data-on-beat={onBeatHead}
              className={`group absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
                removable ? 'cursor-pointer' : ''
              }`}
              style={{
                left: `${beatToX(note.startBeat)}px`,
                top: `${rowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2}px`,
              }}
            >
              <span className="absolute -top-4 text-[10px] text-text-secondary">{pitch}</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-accent text-body ring-4 ring-accent-dim'
                    : onBeatHead
                      ? 'border-2 border-accent bg-body text-accent'
                      : 'border border-edge-strong bg-body text-text-primary'
                } ${removable ? 'group-hover:border-accent group-hover:text-accent' : ''}`}
              >
                <span className={removable ? 'group-hover:hidden' : ''}>{note.position.fret}</span>
                {removable && <span className="hidden group-hover:inline">✕</span>}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
