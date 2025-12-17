import React, { useEffect, useState } from 'react';

interface Star {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  brightness: number;
}

/**
 * Component that renders a starry night sky effect
 */
export const SparkleEffect: React.FC = () => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate random stars with varying sizes and brightness
    const newStars: Star[] = [];
    for (let i = 0; i < 50; i++) {
      newStars.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
        size: Math.random() < 0.7 ? 1 : (Math.random() < 0.9 ? 2 : 3), // Most stars are small
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
    setStars(newStars);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: 'white',
            borderRadius: '50%',
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.brightness})`,
            animation: `starTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes starTwinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
