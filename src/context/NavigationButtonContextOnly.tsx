import { createContext, useContext } from 'react';

export interface NavigationButtonImages {
  prev: string | null;
  next: string | null;
}

export interface NavigationButtonContextType {
  buttonImages: NavigationButtonImages;
  refreshButtonImages: () => Promise<void>;
}

export const NavigationButtonContext = createContext<NavigationButtonContextType | null>(null);

export const useNavigationButtons = () => {
  const context = useContext(NavigationButtonContext);
  if (!context) {
    throw new Error('useNavigationButtons must be used within NavigationButtonProvider');
  }
  return context;
};
