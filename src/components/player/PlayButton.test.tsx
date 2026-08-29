import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { usePlaybackStore } from '../../state/playback-store';

const { play, stop } = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('../../audio', () => ({
  sequencePlayer: { play, stop, onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { PlayButton } from './PlayButton';

describe('PlayButton', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 0 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    usePlaybackStore.setState({ isPlaying: false, currentIndex: null });
    play.mockClear();
    stop.mockClear();
  });

  it('shows "Play" initially and starts playback on click', async () => {
    render(<PlayButton />);
    const button = screen.getByRole('button', { name: /play/i });
    await fireEvent.click(button);
    expect(play).toHaveBeenCalled();
  });
});
