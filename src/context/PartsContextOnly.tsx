export type PartInfo = {
  id: number;
  name: string;
  assetPath: string;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
};

// Photo画面に配置されたステッカー1枚分（位置のみを持ち、サイズは常に元画像の100%）
export type StickerInstance = {
  sticker: PartInfo;
  x: number;
  y: number;
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
  dragPos: { x: number; y: number };
  setDragPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
};

import { createContext } from 'react';
export const PartsContext = createContext<PartsContextType | undefined>(undefined);
