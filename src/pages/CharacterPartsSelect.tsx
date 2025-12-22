import React, { useState, useEffect } from 'react';
import texts from '../locales/ja.json';
import CharacterPartsPanel from '../components/CharacterPartsPanel';
import type { PartInfo as PanelPartInfo } from '../components/CharacterPartsPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const getPartUrl = (part: PanelPartInfo | null): string | null => {
  if (!part) return null;
  return part.assetPath || part.imagePath || part.thumbUrl || part.imageUrl || null;
};

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
    const loadParts = async () => {
      try {
        const faceRes = await fetch(`${API_BASE_URL}/api/face`);
        if (!faceRes.ok) {
          throw new Error(`Failed to fetch faces: ${faceRes.status} ${faceRes.statusText}`);
        }
        const faceData = await faceRes.json();
        setFaces(faceData);

        const frontHairRes = await fetch(`${API_BASE_URL}/api/front-hair`);
        if (!frontHairRes.ok) {
          throw new Error(`Failed to fetch front hairs: ${frontHairRes.status} ${frontHairRes.statusText}`);
        }
        const frontHairData = await frontHairRes.json();
        setFrontHairs(frontHairData);

        const backHairRes = await fetch(`${API_BASE_URL}/api/back-hair`);
        if (!backHairRes.ok) {
          throw new Error(`Failed to fetch back hairs: ${backHairRes.status} ${backHairRes.statusText}`);
        }
        const backHairData = await backHairRes.json();
        setBackHairs(backHairData);
      } catch (error) {
        console.error('Failed to load character parts:', error);
      }
    };

    void loadParts();
  }, []);

    useEffect(() => {
      if (!selectedFace && !selectedFrontHair && !selectedBackHair) {
        setTrimmedPreviewUrl('');
        return;
      }
      const images: string[] = [
        getPartUrl(selectedBackHair),
        getPartUrl(selectedFace),
        getPartUrl(selectedFrontHair)
      ].filter((url): url is string => !!url);
      if (images.length === 0) {
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
