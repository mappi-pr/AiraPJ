import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const CharacterPartsSelect: React.FC = () => {
  const [faces, setFaces] = useState<PartInfo[]>([]);
  const [frontHairs, setFrontHairs] = useState<PartInfo[]>([]);
  const [backHairs, setBackHairs] = useState<PartInfo[]>([]);
  const [faceIdx, setFaceIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const navigate = useNavigate();
  const partsContext = useContext(PartsContext);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/face').then(res => res.json()).then(setFaces);
    fetch('/api/front-hair').then(res => res.json()).then(setFrontHairs);
    fetch('/api/back-hair').then(res => res.json()).then(setBackHairs);
  }, []);

  // 選択内容をContextに保存
  useEffect(() => {
    if (!partsContext) return;
    partsContext.setSelectedParts(prev => ({
      ...prev,
      face: faces[faceIdx] || null,
      frontHair: frontHairs[frontIdx] || null,
      backHair: backHairs[backIdx] || null,
    }));
    // eslint-disable-next-line
  }, [faceIdx, frontIdx, backIdx, faces, frontHairs, backHairs]);

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
            <img 
              src={backHairs[backIdx].assetPath} 
              alt={t.characterPartsSelect.backHair} 
              style={{ 
                position: 'absolute', 
                left: backHairs[backIdx].offsetX || 0, 
                top: backHairs[backIdx].offsetY || 0, 
                zIndex: 0, 
                width: backHairs[backIdx].width || 240, 
                height: backHairs[backIdx].height || 320,
                objectFit: 'contain',
              }} 
            />
          )}
          {faces[faceIdx] && (
            <img 
              src={faces[faceIdx].assetPath} 
              alt={t.characterPartsSelect.face} 
              style={{ 
                position: 'absolute', 
                left: faces[faceIdx].offsetX || 0, 
                top: faces[faceIdx].offsetY || 0, 
                zIndex: 1, 
                width: faces[faceIdx].width || 240, 
                height: faces[faceIdx].height || 320,
                objectFit: 'contain',
              }} 
            />
          )}
          {frontHairs[frontIdx] && (
            <img 
              src={frontHairs[frontIdx].assetPath} 
              alt={t.characterPartsSelect.frontHair} 
              style={{ 
                position: 'absolute', 
                left: frontHairs[frontIdx].offsetX || 0, 
                top: frontHairs[frontIdx].offsetY || 0, 
                zIndex: 2, 
                width: frontHairs[frontIdx].width || 240, 
                height: frontHairs[frontIdx].height || 320,
                objectFit: 'contain',
              }} 
            />
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
