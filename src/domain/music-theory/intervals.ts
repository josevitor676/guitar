const DEGREE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

export function getIntervalSemitones(rootMidi: number, noteMidi: number): number {
  return ((noteMidi - rootMidi) % 12 + 12) % 12;
}

export function getIntervalDegreeLabel(semitones: number): string {
  return DEGREE_LABELS[((semitones % 12) + 12) % 12];
}
