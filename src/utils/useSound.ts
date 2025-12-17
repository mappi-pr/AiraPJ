import { useRef } from 'react';

/**
 * Custom hook for playing sound effects
 * Creates a simple beep sound using Web Audio API when no file is provided
 */
export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check if sound effects are enabled
  const isSoundEnabled = () => localStorage.getItem('seOn') === '1';

  // Initialize AudioContext if needed
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playClick = () => {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Create a pleasant click sound
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const playSuccess = () => {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    
    // Play a two-note success sound
    [523, 659].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = ctx.currentTime + (i * 0.1);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  };

  return { playClick, playSuccess };
};
