import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import CharacterPartsPanel from '../components/CharacterPartsPanel';
import type { PartInfo as PanelPartInfo } from '../components/CharacterPartsPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 画像トリミング時の透明度判定閾値（アルファ値がこの値以下のピクセルを透明とみなす）
const ALPHA_THRESHOLD = 16;

const getPartUrl = (part: PanelPartInfo | null): string | null => {
  if (!part) return null;
  return part.assetPath || part.imagePath || part.thumbUrl || part.imageUrl || null;
};

const convertToContextPartInfo = (part: PanelPartInfo | null) => {
  if (!part) return null;
  return {
    id: part.id,
    name: part.name,
    assetPath: part.assetPath || part.imagePath || part.imageUrl || part.thumbUrl || '',
  };
};

// 画像の透明部分の境界を検出して、内容部分の矩形を返す
const detectContentBounds = (imageData: ImageData): { left: number; top: number; right: number; bottom: number } | null => {
  const { data, width, height } = imageData;
  let top = -1, left = -1, right = -1, bottom = -1;
  
  // 上から下へスキャンしてtopを見つける
  topLoop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > ALPHA_THRESHOLD) {
        top = y;
        break topLoop;
      }
    }
  }
  
  if (top === -1) return null; // 全部透明
  
  // 下から上へスキャンしてbottomを見つける
  bottomLoop: for (let y = height - 1; y >= top; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > ALPHA_THRESHOLD) {
        bottom = y;
        break bottomLoop;
      }
    }
  }
  
  // 左から右へスキャンしてleftを見つける
  leftLoop: for (let x = 0; x < width; x++) {
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > ALPHA_THRESHOLD) {
        left = x;
        break leftLoop;
      }
    }
  }
  
  // 右から左へスキャンしてrightを見つける
  rightLoop: for (let x = width - 1; x >= left; x--) {
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > ALPHA_THRESHOLD) {
        right = x;
        break rightLoop;
      }
    }
  }
  
  if (left === -1 || right === -1 || bottom === -1) return null;
  
  return { left, top, right, bottom };
};

const CharacterPartsSelect: React.FC = () => {
  const navigate = useNavigate();
  const [faces, setFaces] = useState<PanelPartInfo[]>([]);
  const [frontHairs, setFrontHairs] = useState<PanelPartInfo[]>([]);
  const [backHairs, setBackHairs] = useState<PanelPartInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [faceIdx, setFaceIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const [currentTab, setTab] = useState<'face' | 'frontHair' | 'backHair'>('face');
  const [trimmedPreviewUrl, setTrimmedPreviewUrl] = useState<string>('');
  const selectedFace = faces[faceIdx] || null;
  const selectedFrontHair = frontHairs[frontIdx] || null;
  const selectedBackHair = backHairs[backIdx] || null;
  const partsContext = useContext(PartsContext);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

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
      } finally {
        setLoading(false);
      }
    };

    void loadParts();
  }, []);

  // 選択内容をContextに保存
  useEffect(() => {
    if (!partsContext) return;
    partsContext.setSelectedParts(prev => ({
      ...prev,
      face: convertToContextPartInfo(selectedFace),
      frontHair: convertToContextPartInfo(selectedFrontHair),
      backHair: convertToContextPartInfo(selectedBackHair),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partsContext intentionally excluded from deps
  }, [selectedFace, selectedFrontHair, selectedBackHair]);

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
    const size = 512; // Use larger canvas for better quality before trimming
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    Promise.all(images.map(url => {
      return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url.startsWith('http') ? url : (API_BASE_URL + url);
      });
    })).then(imgs => {
      const validImgs = imgs.filter((img): img is HTMLImageElement => img !== null);
      if (validImgs.length === 0) {
        setTrimmedPreviewUrl('');
        return;
      }
      // Draw all images onto the larger canvas
      validImgs.forEach(img => {
        ctx.drawImage(img, 0, 0, size, size);
      });
      
      // Detect the content bounds (trim transparent padding)
      const imageData = ctx.getImageData(0, 0, size, size);
      const bounds = detectContentBounds(imageData);
      
      if (!bounds) {
        setTrimmedPreviewUrl('');
        return;
      }
      
      // Calculate trimmed dimensions
      const trimmedWidth = bounds.right - bounds.left + 1;
      const trimmedHeight = bounds.bottom - bounds.top + 1;
      
      // Create a new canvas for the trimmed content
      const trimmedCanvas = document.createElement('canvas');
      const finalSize = 80;
      trimmedCanvas.width = finalSize;
      trimmedCanvas.height = finalSize;
      const trimmedCtx = trimmedCanvas.getContext('2d');
      if (!trimmedCtx) return;
      
      // Draw the trimmed content scaled to fit the final size
      trimmedCtx.drawImage(
        canvas,
        bounds.left, bounds.top, trimmedWidth, trimmedHeight,
        0, 0, finalSize, finalSize
      );
      
      const dataUrl = trimmedCanvas.toDataURL();
      setTrimmedPreviewUrl(dataUrl);
    });
  }, [selectedFace, selectedFrontHair, selectedBackHair]);

  const handleSelectFace = (part: PanelPartInfo) => {
    playClick();
    const idx = faces.findIndex(f => f.id === part.id);
    if (idx >= 0) setFaceIdx(idx);
  };
  const handleSelectFrontHair = (part: PanelPartInfo) => {
    playClick();
    const idx = frontHairs.findIndex(f => f.id === part.id);
    if (idx >= 0) setFrontIdx(idx);
  };
  const handleSelectBackHair = (part: PanelPartInfo) => {
    playClick();
    const idx = backHairs.findIndex(f => f.id === part.id);
    if (idx >= 0) setBackIdx(idx);
  };

  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/background');
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.characterPartsSelect.title}</h1>
        {loading ? (
          <div style={{ textAlign: 'center', margin: '32px 0', fontSize: 18, color: '#888' }}>{t.common.loading}</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                {trimmedPreviewUrl ? (
                  <img src={trimmedPreviewUrl} alt={t.characterPartsSelect.compositePreview} style={{ width: 80, height: 80, borderRadius: 16 }} />
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
                    onClick={() => { playClick(); setTab(tab); }}
                    type="button"
                  >
                    {tab === 'face' ? t.characterPartsSelect.face : tab === 'frontHair' ? t.characterPartsSelect.frontHair : t.characterPartsSelect.backHair}
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
              <button type="submit">{t.common.next}</button>
            </form>
            <nav>
              <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
            </nav>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default CharacterPartsSelect;
