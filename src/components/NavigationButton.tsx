import React from 'react';
import { useNavigationButtons } from '../context/NavigationButtonContext';

interface NavigationButtonProps {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled?: boolean;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({ 
  direction, 
  onClick, 
  disabled = false 
}) => {
  const { buttonImages } = useNavigationButtons();
  const imageSrc = buttonImages[direction];
  const defaultText = direction === 'prev' ? '←' : '→';

  return (
    <button onClick={onClick} disabled={disabled}>
      {imageSrc ? (
        <img 
          src={imageSrc} 
          alt={defaultText} 
          style={{ maxWidth: 40, maxHeight: 40, display: 'block' }} 
        />
      ) : (
        defaultText
      )}
    </button>
  );
};
