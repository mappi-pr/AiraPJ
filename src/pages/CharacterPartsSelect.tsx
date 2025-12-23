import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import CharacterPartsPanel from '../components/CharacterPartsPanel';
import type { PartInfo as PanelPartInfo } from '../components/CharacterPartsPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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
  }, [faceIdx, frontIdx, backIdx]);

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
      validImgs.forEach(img => {
        ctx.drawImage(img, 0, 0, size, size);
      });
      const dataUrl = canvas.toDataURL();
      // Composite preview generated by layering and scaling images
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
