import React, { useState } from 'react';
import type { PartInfo, SelectedParts, PartsContextType } from './PartsContextOnly';
import { PartsContext } from './PartsContextOnly';

export type { PartInfo, SelectedParts, PartsContextType };

export const PartsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedParts, setSelectedParts] = useState<SelectedParts>({
    background: null,
    costume: null,
    backHair: null,
    face: null,
    frontHair: null,
  });
  const [scale, setScale] = useState(1);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  return (
    <PartsContext.Provider value={{ selectedParts, setSelectedParts, scale, setScale, dragPos, setDragPos }}>
      {children}
    </PartsContext.Provider>
  );
};
