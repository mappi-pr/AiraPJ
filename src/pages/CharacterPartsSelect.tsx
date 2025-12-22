import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const getPartUrl = (part: PanelPartInfo | null): string | null => {
  if (!part) return null;
  return part.assetPath || part.imagePath || part.thumbUrl || part.imageUrl || null;
};

const CharacterPartsSelect: React.FC = () => {
  const navigate = useNavigate();
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
  const navigate = useNavigate();
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
      navigate('/background');
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
  const handlePrev = (type: 'face' | 'front' | 'back') => {
    playClick();
    if (type === 'face') setFaceIdx((faceIdx - 1 + faces.length) % faces.length);
    if (type === 'front') setFrontIdx((frontIdx - 1 + frontHairs.length) % frontHairs.length);
    if (type === 'back') setBackIdx((backIdx - 1 + backHairs.length) % backHairs.length);
  };
  const handleNext = (type: 'face' | 'front' | 'back') => {
    playClick();
    if (type === 'face') setFaceIdx((faceIdx + 1) % faces.length);
    if (type === 'front') setFrontIdx((frontIdx + 1) % frontHairs.length);
    if (type === 'back') setBackIdx((backIdx + 1) % backHairs.length);
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '24px 0' }}>
          <div>
            <div>{t.characterPartsSelect.face}</div>
            <button onClick={() => handlePrev('face')}>←</button>
            <span style={{ minWidth: 60, display: 'inline-block' }}>{faces.length === 0 ? t.common.noData : (faces[faceIdx]?.name || '')}</span>
            <button onClick={() => handleNext('face')}>→</button>
          </div>
          <div>
            <div>{t.characterPartsSelect.frontHair}</div>
            <button onClick={() => handlePrev('front')}>←</button>
            <span style={{ minWidth: 60, display: 'inline-block' }}>{frontHairs.length === 0 ? t.common.noData : (frontHairs[frontIdx]?.name || '')}</span>
            <button onClick={() => handleNext('front')}>→</button>
          </div>
          <div>
            <div>{t.characterPartsSelect.backHair}</div>
            <button onClick={() => handlePrev('back')}>←</button>
            <span style={{ minWidth: 60, display: 'inline-block' }}>{backHairs.length === 0 ? t.common.noData : (backHairs[backIdx]?.name || '')}</span>
            <button onClick={() => handleNext('back')}>→</button>
          </div>
        </div>
        <div style={{ position: 'relative', width: 240, height: 320, margin: '0 auto' }}>
          {/* 後髪 → 顔 → 前髪 の順で重ねる */}
          {backHairs[backIdx] && (
            <img src={backHairs[backIdx].assetPath} alt={t.characterPartsSelect.backHair} style={{ position: 'absolute', left: 0, top: 0, zIndex: 0, width: 240, height: 320 }} />
          )}
          {faces[faceIdx] && (
            <img src={faces[faceIdx].assetPath} alt={t.characterPartsSelect.face} style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, width: 240, height: 320 }} />
          )}
          {frontHairs[frontIdx] && (
            <img src={frontHairs[frontIdx].assetPath} alt={t.characterPartsSelect.frontHair} style={{ position: 'absolute', left: 0, top: 0, zIndex: 2, width: 240, height: 320 }} />
          )}
        </div>
        <form onSubmit={handleNextPage}>
          <button type="submit">{t.common.next}</button>
        </form>
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default CharacterPartsSelect;
