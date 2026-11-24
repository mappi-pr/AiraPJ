import React, { useState, useEffect } from 'react';
import { NavigationButtonContext } from './NavigationButtonContextOnly';
import type { NavigationButtonImages } from './NavigationButtonContextOnly';

export type { NavigationButtonImages, NavigationButtonContextType } from './NavigationButtonContextOnly';

export const NavigationButtonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buttonImages, setButtonImages] = useState<NavigationButtonImages>({
    prev: null,
    next: null,
  });

  const refreshButtonImages = async () => {
    try {
      const res = await fetch('/api/navigation-buttons');
      const data = await res.json();
      const images: NavigationButtonImages = {
        prev: null,
        next: null,
      };
      data.forEach((btn: { buttonType: 'prev' | 'next'; assetPath: string | null }) => {
        images[btn.buttonType] = btn.assetPath;
      });
      setButtonImages(images);
    } catch (error) {
      console.error('Failed to fetch navigation button images:', error);
    }
  };

  useEffect(() => {
    refreshButtonImages();
  }, []);

  return (
    <NavigationButtonContext.Provider value={{ buttonImages, refreshButtonImages }}>
      {children}
    </NavigationButtonContext.Provider>
  );
};
