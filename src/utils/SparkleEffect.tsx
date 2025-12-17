import React, { useEffect, useState } from 'react';

interface Sparkle {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

/**
 * Component that renders floating sparkle particles across the screen
 */
export const SparkleEffect: React.FC = () => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    // Generate random sparkles
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 20; i++) {
      newSparkles.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2,
        size: 2 + Math.random() * 3,
      });
    }
    setSparkles(newSparkles);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          style={{
            position: 'absolute',
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
            animation: `twinkle ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
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
