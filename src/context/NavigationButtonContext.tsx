import React, { createContext, useState, useEffect, useContext } from 'react';

export interface NavigationButtonImages {
  prev: string | null;
  next: string | null;
}

export interface NavigationButtonContextType {
  buttonImages: NavigationButtonImages;
  refreshButtonImages: () => Promise<void>;
}

export const NavigationButtonContext = createContext<NavigationButtonContextType | null>(null);

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

export const useNavigationButtons = () => {
  const context = useContext(NavigationButtonContext);
  if (!context) {
    throw new Error('useNavigationButtons must be used within NavigationButtonProvider');
  }
  return context;
};
