import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [6, 5, 4, 3, 2, 1];

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;

  return (
    <div className="inline-block border-l-4 border-neutral-200 bg-neutral-900">
      {STRING_ORDER.map((string) => (
        <div key={string} className="flex items-center border-b border-neutral-700">
          <span className="w-10 text-center text-sm text-neutral-400">{STANDARD_TUNING[string]}</span>
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
  );
}
