import { useEffect, useRef } from 'react';
import type { TimedNote } from '../../domain/playback/timeline-model';
import { timelineLengthInBeats } from '../../domain/playback/timeline-model';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];
const PX_PER_BEAT = 72;
const ROW_HEIGHT_PX = 48;
const LABEL_WIDTH_PX = 40;
const TRAILING_BEATS = 2;
const SCROLL_MARGIN_PX = 120;

interface TimelineRollProps {
  timeline: TimedNote[];
  currentIndex: number | null;
}

function beatToX(beat: number): number {
  return LABEL_WIDTH_PX + beat * PX_PER_BEAT;
}

export function TimelineRoll({ timeline, currentIndex }: TimelineRollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeNote = currentIndex !== null ? timeline[currentIndex] : undefined;
  const playheadX = beatToX(activeNote ? activeNote.startBeat : 0);
  const widthPx = beatToX(timelineLengthInBeats(timeline) + TRAILING_BEATS);
  const gridHeightPx = STRING_ORDER.length * ROW_HEIGHT_PX;

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
      <div className="flex h-72 items-center justify-center text-sm text-text-secondary">
        Monte uma sequência no braço para vê-la aqui.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="relative overflow-x-auto">
      <div className="relative" style={{ width: `${widthPx}px`, height: `${gridHeightPx}px` }}>
        {STRING_ORDER.map((string) => (
          <div
            key={string}
            data-testid={`timeline-string-row-${string}`}
            className="relative flex items-center"
            style={{ height: `${ROW_HEIGHT_PX}px` }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]" />
            <span className="relative z-10 w-10 text-center text-sm text-text-secondary">
              {getPitchClass(STANDARD_TUNING[string])}
            </span>
          </div>
        ))}

        <div
          data-testid="timeline-playhead"
          aria-hidden="true"
          className="absolute top-0 z-20 w-px bg-accent transition-all duration-100"
          style={{ left: `${playheadX}px`, height: `${gridHeightPx}px` }}
        >
          <span className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-b-[6px] border-x-transparent border-b-accent" />
        </div>

        {timeline.map((note) => {
          const rowIndex = STRING_ORDER.indexOf(note.position.string);
          const active = currentIndex === note.index;
          const pitch = getNoteAt(STANDARD_TUNING, note.position).pitchClass;

          return (
            <div
              key={note.index}
              data-testid={`timeline-note-${note.index}`}
              data-string={note.position.string}
              data-active={active}
              className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{
                left: `${beatToX(note.startBeat)}px`,
                top: `${rowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2}px`,
              }}
            >
              <span className="absolute -top-4 text-[10px] text-text-secondary">{pitch}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-accent text-body ring-4 ring-accent-dim'
                    : 'border border-white/20 bg-body text-text-primary'
                }`}
              >
                {note.position.fret}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
