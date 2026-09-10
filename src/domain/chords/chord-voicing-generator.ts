import type { StringNumber, Tuning } from '../music-theory/tuning';
import { getNoteAt } from '../music-theory/notes';
import { ALL_STRINGS, isSounding, voicingSpan, lowestFret, voicingKey } from './chord-voicing';
import { fingerChord } from './chord-fingering';
import type { ChordVoicing, StringPlay } from './chord-voicing';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Four frets is what a hand covers without shifting. */
const WINDOW_FRETS = 4;
/** The neck runs to the 24th fret, and shapes are found for most of it. */
const HIGHEST_WINDOW_START = 17;
const MAX_MUTED = 2;
/** How many shapes to keep from any one position, so the list walks the neck. */
const PER_POSITION = 4;

export interface VoicingSearch {
  root: string;
  intervals: number[];
  tuning: Tuning;
  limit?: number;
}

function semitoneOf(pitchClass: string): number {
  return PITCH_CLASSES.indexOf(pitchClass);
}

/** The frets on one string, inside a window, whose note belongs to the chord. */
function candidatesFor(
  string: StringNumber,
  tuning: Tuning,
  chordSemitones: Set<number>,
  windowStart: number,
): StringPlay[] {
  const options: StringPlay[] = ['muted'];

  // An open string only belongs to a shape held at the nut. Offering it in
  // every position produces chords nobody plays — fret 15 with three strings
  // ringing open is a G, and it is not a G shape.
  const nearTheNut = windowStart <= 1;
  const window = Array.from({ length: WINDOW_FRETS }, (_, index) => windowStart + index).filter(
    (fret) => fret > 0,
  );
  const frets = nearTheNut ? [0, ...window] : window;

  for (const fret of frets) {
    const semitone = getNoteAt(tuning, { string, fret }).midi % 12;
    if (chordSemitones.has(((semitone % 12) + 12) % 12)) options.push(fret);
  }

  return options;
}

/** True when a silent string sits between two sounding ones more than once. */
function hasAwkwardInnerMute(voicing: ChordVoicing): boolean {
  const plays = ALL_STRINGS.map((string) => voicing[string]);
  const first = plays.findIndex(isSounding);
  const last = plays.length - 1 - [...plays].reverse().findIndex(isSounding);

  let inner = 0;
  for (let i = first + 1; i < last; i += 1) {
    if (!isSounding(plays[i])) inner += 1;
  }
  return inner > 1;
}

/**
 * Playable ways to hold one chord along the neck.
 *
 * The search stays small because the candidates on each string are filtered by
 * the chord before they are combined: two or three frets per string rather than
 * every fret in the window.
 */
/** How much easier one grip has to be to earn its own entry. */
const FINGERS_SAVED_TO_MATTER = 2;
const BARRE_STRINGS_SAVED_TO_MATTER = 2;

/** The lowest-pitched string that sounds, which is the one carrying the bass. */
function bassString(voicing: ChordVoicing): StringNumber | null {
  return ALL_STRINGS.find((string) => isSounding(voicing[string])) ?? null;
}

/**
 * True when `lesser` is `fuller` with strings taken away and nothing else.
 *
 * Muting the bass string is never merely taking a string away: it puts a
 * different note underneath and so names a different chord. Dropping the sixth
 * string of a G turns it into a G/D, and calling one a lesser copy of the other
 * would hide a chord behind its own inversion.
 */
function isSubsumedBy(lesser: ChordVoicing, fuller: ChordVoicing): boolean {
  if (bassString(lesser) !== bassString(fuller)) return false;

  let strictlyFewer = false;

  for (const string of ALL_STRINGS) {
    const a = lesser[string];
    const b = fuller[string];

    if (isSounding(a)) {
      if (!isSounding(b) || a !== b) return false;
    } else if (isSounding(b)) {
      strictlyFewer = true;
    }
  }

  return strictlyFewer;
}

/**
 * True when the smaller grip is worth listing beside the fuller one.
 *
 * Muting one string of a shape usually produces a voicing the hand plays
 * identically, and listing both fills the page with the same chord over and
 * over. But dropping strings can also turn a six-string barre into a
 * four-string grip with no bar at all — a different chord to play, and usually
 * the one a student can actually reach. That earns its place.
 */
function isWorthKeepingBesides(lesser: ChordVoicing, fuller: ChordVoicing): boolean {
  const lesserGrip = fingerChord(lesser);
  const fullerGrip = fingerChord(fuller);

  // How wide the bar is, not merely whether there is one: laying the index
  // across two strings and across six are different techniques, and the
  // narrower grip is often the only one a student can reach.
  const barWidth = (grip: typeof lesserGrip) =>
    grip.barre ? Math.abs(grip.barre.fromString - grip.barre.toString) + 1 : 0;

  if (barWidth(fullerGrip) - barWidth(lesserGrip) >= BARRE_STRINGS_SAVED_TO_MATTER) return true;

  const fingersSaved =
    new Set(fullerGrip.fingers.map((f) => f.finger)).size -
    new Set(lesserGrip.fingers.map((f) => f.finger)).size;
  return fingersSaved >= FINGERS_SAVED_TO_MATTER;
}

/** Drops shapes that are another shape with strings removed and nothing gained. */
function keepFullestShapes(voicings: ChordVoicing[]): ChordVoicing[] {
  return voicings.filter(
    (candidate) =>
      !voicings.some(
        (other) =>
          other !== candidate &&
          isSubsumedBy(candidate, other) &&
          !isWorthKeepingBesides(candidate, other),
      ),
  );
}

export function suggestVoicings({ root, intervals, tuning, limit = 30 }: VoicingSearch): ChordVoicing[] {
  const rootSemitone = semitoneOf(root);
  if (rootSemitone < 0) return [];

  const chordSemitones = new Set(intervals.map((interval) => (rootSemitone + interval) % 12));
  const required = intervals.map((interval) => (rootSemitone + interval) % 12);

  const found = new Map<string, { voicing: ChordVoicing; score: number }>();

  for (let windowStart = 0; windowStart <= HIGHEST_WINDOW_START; windowStart += 1) {
    const perString = ALL_STRINGS.map((string) => candidatesFor(string, tuning, chordSemitones, windowStart));

    const build = (index: number, partial: Partial<ChordVoicing>) => {
      if (index === ALL_STRINGS.length) {
        const voicing = partial as ChordVoicing;

        const sounding = ALL_STRINGS.filter((string) => isSounding(voicing[string]));
        if (sounding.length < 4) return;
        if (ALL_STRINGS.length - sounding.length > MAX_MUTED) return;
        if (voicingSpan(voicing) > WINDOW_FRETS - 1) return;
        if (hasAwkwardInnerMute(voicing)) return;

        // Every note of the chord has to be somewhere in the shape, or it is a
        // different chord wearing this one's name.
        const played = new Set(
          sounding.map((string) => {
            const fret = voicing[string] as number;
            return ((getNoteAt(tuning, { string, fret }).midi % 12) + 12) % 12;
          }),
        );
        if (!required.every((semitone) => played.has(semitone))) return;

        const bassString = sounding[0];
        const bassSemitone = ((getNoteAt(tuning, { string: bassString, fret: voicing[bassString] as number }).midi % 12) + 12) % 12;

        const score =
          (bassSemitone === rootSemitone ? 0 : 40) +
          (ALL_STRINGS.length - sounding.length) * 8 +
          (lowestFret(voicing) ?? 0) +
          voicingSpan(voicing);

        const key = voicingKey(voicing);
        const existing = found.get(key);
        if (!existing || score < existing.score) found.set(key, { voicing, score });
        return;
      }

      for (const play of perString[index]) {
        build(index + 1, { ...partial, [ALL_STRINGS[index]]: play });
      }
    };

    build(0, {});
  }

  const ranked = [...found.values()].sort((a, b) => a.score - b.score).map((entry) => entry.voicing);
  const distinct = keepFullestShapes(ranked);

  // Taking the best scores outright buries every shape past the third fret,
  // because a low position always scores better. Walking the neck is the point
  // of the list, so each position contributes its best few in turn.
  //
  // Position alone is not enough to group by: a six-string barre always
  // outscores the four-string grip beside it, because muted strings are
  // penalised, and the easier shape would never be shown. Full and partial
  // grips are counted separately so both survive at every position.
  const buckets = new Map<string, ChordVoicing[]>();
  for (const voicing of distinct) {
    const position = lowestFret(voicing) ?? 0;
    const sounding = ALL_STRINGS.filter((string) => isSounding(voicing[string])).length;
    const key = `${position}:${sounding >= 6 ? 'full' : 'partial'}`;

    const bucket = buckets.get(key) ?? [];
    if (bucket.length < PER_POSITION) bucket.push(voicing);
    buckets.set(key, bucket);
  }

  const orderedKeys = [...buckets.keys()].sort((a, b) => {
    const [positionA] = a.split(':');
    const [positionB] = b.split(':');
    return Number(positionA) - Number(positionB) || a.localeCompare(b);
  });

  const spread: ChordVoicing[] = [];
  for (let rank = 0; rank < PER_POSITION; rank += 1) {
    for (const key of orderedKeys) {
      const voicing = buckets.get(key)?.[rank];
      if (voicing) spread.push(voicing);
    }
  }

  return spread.slice(0, limit);
}
