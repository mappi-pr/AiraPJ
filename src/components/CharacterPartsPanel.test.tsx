import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterPartsPanel from './CharacterPartsPanel';

const parts = [
  { id: 1, name: 'face-1', assetPath: '/uploads/face/1.png' },
  { id: 2, name: 'face-2', assetPath: '/uploads/face/2.png' },
];

describe('CharacterPartsPanel (#147)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => parts,
      }))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('fetches the full list once without a page parameter and does not refetch on scroll', async () => {
    const { container } = render(
      <CharacterPartsPanel partType="face" selectedId={null} onSelect={() => {}} />
    );

    expect(await screen.findByTitle('face-1')).toBeTruthy();
    expect(await screen.findByTitle('face-2')).toBeTruthy();

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/api/face');
    expect(url).not.toContain('page=');

    // スクロールしても追加取得しない
    const panel = container.firstChild as HTMLElement;
    fireEvent.scroll(panel);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
