import React, { useState } from 'react';
import type { Locale } from '../types/locale';
import VisualPositionEditor from './VisualPositionEditor';

export interface AssetMetadataItem {
  id: number;
  name: string;
  assetPath: string;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
}

export interface AssetMetadataValues {
  name: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface AssetMetadataEditorProps {
  item: AssetMetadataItem;
  onSave: (values: AssetMetadataValues) => void;
  onCancel: () => void;
  t: Locale;
}

// アセットの名前・位置・サイズを編集するフォーム。
// Settings のアセットカード内に展開して使う。
const AssetMetadataEditor: React.FC<AssetMetadataEditorProps> = ({ item, onSave, onCancel, t }) => {
  const [name, setName] = useState(item.name || '');
  const [offsetX, setOffsetX] = useState(String(item.offsetX ?? 0));
  const [offsetY, setOffsetY] = useState(String(item.offsetY ?? 0));
  const [width, setWidth] = useState(String(item.width ?? 240));
  const [height, setHeight] = useState(String(item.height ?? 320));
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [hasError, setHasError] = useState(false);

  const parseField = (value: string, min: number, max: number): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
    return parsed;
  };

  const handleSave = () => {
    const parsedOffsetX = parseField(offsetX, -1000, 1000);
    const parsedOffsetY = parseField(offsetY, -1000, 1000);
    const parsedWidth = parseField(width, 1, 2000);
    const parsedHeight = parseField(height, 1, 2000);
    if (name.trim() === '' || parsedOffsetX === null || parsedOffsetY === null || parsedWidth === null || parsedHeight === null) {
      setHasError(true);
      return;
    }
    setHasError(false);
    onSave({
      name,
      offsetX: parsedOffsetX,
      offsetY: parsedOffsetY,
      width: parsedWidth,
      height: parsedHeight,
    });
  };

  const handleVisualEditorSave = (newOffsetX: number, newOffsetY: number) => {
    setOffsetX(String(newOffsetX));
    setOffsetY(String(newOffsetY));
    setShowVisualEditor(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    marginBottom: '4px',
    fontWeight: 'bold',
  };

  // ビジュアルエディタに渡すサイズ（不正な入力時はデフォルト値）
  const visualWidth = parseField(width, 1, 2000) ?? 240;
  const visualHeight = parseField(height, 1, 2000) ?? 320;
  const visualOffsetX = parseField(offsetX, -1000, 1000) ?? 0;
  const visualOffsetY = parseField(offsetY, -1000, 1000) ?? 0;

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>{t.settings.nameLabel}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label style={labelStyle}>{t.settings.offsetX}:</label>
          <input type="number" value={offsetX} onChange={(e) => setOffsetX(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.settings.offsetY}:</label>
          <input type="number" value={offsetY} onChange={(e) => setOffsetY(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.settings.width}:</label>
          <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.settings.height}:</label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {hasError && (
        <div style={{ color: '#dc3545', fontSize: '12px', marginBottom: '8px' }}>{t.settings.editFail}</div>
      )}

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setShowVisualEditor((prev) => !prev)}
          style={{
            padding: '8px 16px',
            backgroundColor: showVisualEditor ? '#6c757d' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {showVisualEditor ? t.settings.closeVisualEditor : t.settings.visualEditor}
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {t.settings.saveBtn}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {t.settings.cancelBtn}
        </button>
      </div>

      {showVisualEditor && (
        <VisualPositionEditor
          imagePath={item.assetPath}
          initialOffsetX={visualOffsetX}
          initialOffsetY={visualOffsetY}
          initialWidth={visualWidth}
          initialHeight={visualHeight}
          onSave={handleVisualEditorSave}
          onClose={() => setShowVisualEditor(false)}
          t={t}
        />
      )}
    </div>
  );
};

export default AssetMetadataEditor;
