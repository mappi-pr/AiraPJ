export type PartInfo = {
  id: number;
  name: string;
  assetPath: string;
};

export type StickerInstance = {
  sticker: PartInfo;
  x: number;
  y: number;
  scale: number;
};

export type SelectedParts = {
  background: PartInfo | null;
  costume: PartInfo | null;
  backHair: PartInfo | null;
  face: PartInfo | null;
  frontHair: PartInfo | null;
  stickers: StickerInstance[];
};

export type PartsContextType = {
  selectedParts: SelectedParts;
  setSelectedParts: React.Dispatch<React.SetStateAction<SelectedParts>>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
};

import { createContext } from 'react';
export const PartsContext = createContext<PartsContextType | undefined>(undefined);
