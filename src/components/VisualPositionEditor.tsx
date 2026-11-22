import React, { useState } from 'react';
import type { Locale } from '../types/locale';

interface VisualPositionEditorProps {
  imagePath: string;
  initialOffsetX: number;
  initialOffsetY: number;
  initialWidth: number;
  initialHeight: number;
  onSave: (offsetX: number, offsetY: number) => void;
  onClose: () => void;
  t: Locale;
}

// パーツ画像をドラッグして表示位置（offsetX / offsetY）を調整するエディタ。
// キャンバスはフォトエリア相当の 240x320 を 2 倍表示する。
const VisualPositionEditor: React.FC<VisualPositionEditorProps> = ({
  imagePath,
  initialOffsetX,
  initialOffsetY,
  initialWidth,
  initialHeight,
  onSave,
  onClose,
  t,
}) => {
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CANVAS_WIDTH = 240;
  const CANVAS_HEIGHT = 320;
  const DISPLAY_SCALE = 2; // Display at 2x for better visibility

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) return; // Only drag the image, not the canvas
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offsetX * DISPLAY_SCALE,
      y: e.clientY - offsetY * DISPLAY_SCALE,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const newOffsetX = Math.round((e.clientX - dragStart.x) / DISPLAY_SCALE);
    const newOffsetY = Math.round((e.clientY - dragStart.y) / DISPLAY_SCALE);

    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCenter = () => {
    const centerX = Math.round((CANVAS_WIDTH - initialWidth) / 2);
    const centerY = Math.round((CANVAS_HEIGHT - initialHeight) / 2);
    setOffsetX(centerX);
    setOffsetY(centerY);
  };

  return (
    <div
      style={{
        backgroundColor: '#f9f9f9',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #ddd',
        marginTop: '15px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>{t.settings.visualEditor}</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>{t.settings.dragToPosition}</p>

      {/* Canvas Preview */}
      <div
        style={{
          position: 'relative',
          width: `${CANVAS_WIDTH * DISPLAY_SCALE}px`,
          height: `${CANVAS_HEIGHT * DISPLAY_SCALE}px`,
          maxWidth: '100%',
          border: '2px solid #333',
          backgroundColor: '#f0f0f0',
          backgroundImage:
            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          margin: '20px auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid lines for reference */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${(CANVAS_WIDTH * DISPLAY_SCALE) / 2}px`,
            width: '1px',
            height: '100%',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${(CANVAS_HEIGHT * DISPLAY_SCALE) / 2}px`,
            left: 0,
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
          }}
        />

        {/* Image */}
        <img
          src={imagePath}
          alt="Preview"
          draggable={false}
          style={{
            position: 'absolute',
            left: `${offsetX * DISPLAY_SCALE}px`,
            top: `${offsetY * DISPLAY_SCALE}px`,
            width: `${initialWidth * DISPLAY_SCALE}px`,
            height: `${initialHeight * DISPLAY_SCALE}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            border: '2px solid rgba(0, 120, 255, 0.5)',
            boxShadow: '0 0 10px rgba(0, 120, 255, 0.3)',
          }}
        />
      </div>

      {/* Position Info */}
      <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px', color: '#666' }}>
        X: {offsetX}px, Y: {offsetY}px
        <br />
        {t.settings.width}: {initialWidth}px, {t.settings.height}: {initialHeight}px
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleCenter}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {t.settings.centerBtn}
        </button>
        <button
          type="button"
          onClick={() => onSave(offsetX, offsetY)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {t.settings.saveBtn}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {t.settings.cancelBtn}
        </button>
      </div>
    </div>
  );
};

export default VisualPositionEditor;
