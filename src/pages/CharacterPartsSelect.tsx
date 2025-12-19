import React, { useState, useEffect } from 'react';
import texts from '../locales/ja.json';
import CharacterPartsPanel from '../components/CharacterPartsPanel';
import type { PartInfo as PanelPartInfo } from '../components/CharacterPartsPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const CharacterPartsSelect: React.FC = () => {
  const [faces, setFaces] = useState<PanelPartInfo[]>([]);
  const [frontHairs, setFrontHairs] = useState<PanelPartInfo[]>([]);
  const [backHairs, setBackHairs] = useState<PanelPartInfo[]>([]);
  const [faceIdx, setFaceIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const [currentTab, setTab] = useState<'face' | 'frontHair' | 'backHair'>('face');
  const [trimmedPreviewUrl, setTrimmedPreviewUrl] = useState<string>('');
  const selectedFace = faces[faceIdx] || null;
  const selectedFrontHair = frontHairs[frontIdx] || null;
  const selectedBackHair = backHairs[backIdx] || null;
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/face`).then(res => res.json()).then(data => setFaces(data));
    fetch(`${API_BASE_URL}/api/front-hair`).then(res => res.json()).then(data => setFrontHairs(data));
    fetch(`${API_BASE_URL}/api/back-hair`).then(res => res.json()).then(data => setBackHairs(data));
  }, []);

    useEffect(() => {
      if (!selectedFace && !selectedFrontHair && !selectedBackHair) {
        setTrimmedPreviewUrl('');
        return;
      }
      const images: string[] = [];
      if (selectedBackHair) images.push(selectedBackHair.imageUrl || selectedBackHair.assetPath || selectedBackHair.thumbUrl);
      if (selectedFace) images.push(selectedFace.imageUrl || selectedFace.assetPath || selectedFace.thumbUrl);
      if (selectedFrontHair) images.push(selectedFrontHair.imageUrl || selectedFrontHair.assetPath || selectedFrontHair.thumbUrl);
      if (images.length === 0 || images.some(url => !url)) {
        setTrimmedPreviewUrl('');
        return;
      }
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      Promise.all(images.map(url => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = url.startsWith('http') ? url : (API_BASE_URL + url);
        });
      })).then(imgs => {
        imgs.forEach(img => {
          ctx.drawImage(img, 0, 0, size, size);
        });
        const dataUrl = canvas.toDataURL();
        // 現在は各レイヤー画像をそのまま縮小描画してプレビューを生成しており、ここではトリミング処理は行っていない
        setTrimmedPreviewUrl(dataUrl);
      });
    }, [selectedFace, selectedFrontHair, selectedBackHair]);
  
    const handleSelectFace = (part: PanelPartInfo) => {
      const idx = faces.findIndex(f => f.id === part.id);
      if (idx >= 0) setFaceIdx(idx);
    };
    const handleSelectFrontHair = (part: PanelPartInfo) => {
      const idx = frontHairs.findIndex(f => f.id === part.id);
      if (idx >= 0) setFrontIdx(idx);
    };
    const handleSelectBackHair = (part: PanelPartInfo) => {
      const idx = backHairs.findIndex(f => f.id === part.id);
      if (idx >= 0) setBackIdx(idx);
    };
  
    const handleNextPage = (e: React.FormEvent) => {
      e.preventDefault();
      window.location.href = '/background';
    };
  
    return (
      <div className="main-container">
        <h1>{texts.characterPartsSelect.title}</h1>
        {(faces.length === 0 || frontHairs.length === 0 || backHairs.length === 0) ? (
          <div style={{ textAlign: 'center', margin: '32px 0', fontSize: 18, color: '#888' }}>{texts.common.loading}</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                {trimmedPreviewUrl ? (
                  <img src={trimmedPreviewUrl} alt="合成プレビュー" style={{ width: 80, height: 80, borderRadius: 16 }} />
                ) : (
                  <div style={{ width: 80, height: 80, background: '#eee', borderRadius: 16 }} />
                )}
              </div>
            </div>
            <div style={{ margin: '24px 0', textAlign: 'center' }}>
              <div className="tab-bar">
                {(['face', 'frontHair', 'backHair'] as const).map(tab => (
                  <button
                    key={tab}
                    className={"tab-btn" + (tab === currentTab ? " active" : "")}
                    onClick={() => setTab(tab)}
                    type="button"
                  >
                    {tab === 'face' ? texts.characterPartsSelect.face : tab === 'frontHair' ? texts.characterPartsSelect.frontHair : texts.characterPartsSelect.backHair}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                {currentTab === 'face' && (
                  <CharacterPartsPanel
                    partType="face"
                    selectedId={selectedFace?.id ?? null}
                    onSelect={handleSelectFace}
                  />
                )}
                {currentTab === 'frontHair' && (
                  <CharacterPartsPanel
                    partType="frontHair"
                    selectedId={selectedFrontHair?.id ?? null}
                    onSelect={handleSelectFrontHair}
                  />
                )}
                {currentTab === 'backHair' && (
                  <CharacterPartsPanel
                    partType="backHair"
                    selectedId={selectedBackHair?.id ?? null}
                    onSelect={handleSelectBackHair}
                  />
                )}
              </div>
            </div>
            <form onSubmit={handleNextPage}>
              <button type="submit">{texts.common.next}</button>
            </form>
            <nav>
              <a href="/title">{texts.common.backToTitle}</a>
            </nav>
          </>
        )}
      </div>
    );
  };
  
  export default CharacterPartsSelect;
