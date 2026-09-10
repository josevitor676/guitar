import { useEffect, useRef } from 'react';
import { sequencePlayer } from '../audio';
import { completedLoop } from '../domain/practice/speed-trainer';
import { useSpeedTrainerStore } from '../state/speed-trainer-store';
import { useMetronomeStore } from '../state/metronome-store';

/**
 * Runs a speed-training session against playback.
 *
 * The climb has to happen *between* loops and without interrupting one: the
 * student is mid-passage with both hands on the instrument, so the tempo is
 * retuned on the running sequence rather than by starting it again.
 *
 * A one-note sequence cannot be trained, because a loop is detected by the
 * note index returning to zero and a single note never leaves it. Nothing worth
 * drilling for speed is one note long.
 */
export function useSpeedTrainer({ stop }: { stop: () => void }): void {
  const session = useSpeedTrainerStore((state) => state.session);
  const completeLoop = useSpeedTrainerStore((state) => state.completeLoop);
  const setBpm = useMetronomeStore((state) => state.setBpm);

  const previousIndex = useRef<number | null>(null);
  const running = !!session && !session.finished;

  useEffect(() => {
    if (!running) {
      previousIndex.current = null;
      return;
    }

    return sequencePlayer.onNoteChange((index) => {
      if (completedLoop(previousIndex.current, index)) completeLoop();
      previousIndex.current = index;
    });
  }, [running, completeLoop]);

  const bpm = session?.bpm;
  useEffect(() => {
    if (bpm === undefined) return;
    setBpm(bpm);
    sequencePlayer.setBpm(bpm);
  }, [bpm, setBpm]);

  const finished = session?.finished ?? false;
  useEffect(() => {
    if (finished) stop();
  }, [finished, stop]);
}
