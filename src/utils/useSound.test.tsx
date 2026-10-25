import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSound } from './useSound';

describe('useSound', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not create audio nodes when sound effects are disabled', () => {
    const audioContextConstructor = vi.fn();
    vi.stubGlobal('AudioContext', audioContextConstructor);
    const { result } = renderHook(() => useSound());

    act(() => result.current.playClick());

    expect(audioContextConstructor).not.toHaveBeenCalled();
  });

  it('plays click and success sounds when enabled', () => {
    localStorage.setItem('seOn', '1');
    const oscillator = {
      frequency: { value: 0 },
      type: 'sine',
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const createOscillator = vi.fn(() => oscillator);
    const createGain = vi.fn(() => gain);
    const audioContextConstructor = vi.fn(function AudioContextMock() {
      return {
        currentTime: 1,
        destination: {},
        createOscillator,
        createGain,
      };
    });
    vi.stubGlobal('AudioContext', audioContextConstructor);

    const { result } = renderHook(() => useSound());

    act(() => result.current.playClick());
    expect(createOscillator).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalledWith(1);
    expect(oscillator.stop).toHaveBeenCalledWith(1.1);

    act(() => result.current.playSuccess());
    expect(createOscillator).toHaveBeenCalledTimes(3);
    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
  });
});
