interface PulseIndicatorProps {
  currentPulse: number;
  isPlaying: boolean;
}

export function PulseIndicator({ currentPulse, isPlaying }: PulseIndicatorProps) {
  return (
    <div
      data-testid="pulse-indicator"
      data-pulse={currentPulse}
      className={`h-4 w-4 rounded-full transition-all duration-200 ${isPlaying ? 'bg-accent' : 'bg-white/10'}`}
    />
  );
}
