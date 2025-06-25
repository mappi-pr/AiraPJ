import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import texts from '../locales/ja.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const CharacterPartsSelect: React.FC = () => {
  const [faces, setFaces] = useState<any[]>([]);
  const [frontHairs, setFrontHairs] = useState<any[]>([]);
  const [backHairs, setBackHairs] = useState<any[]>([]);
  const [faceIdx, setFaceIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/face').then(res => res.json()).then(setFaces);
    fetch('/api/front-hair').then(res => res.json()).then(setFrontHairs);
    fetch('/api/back-hair').then(res => res.json()).then(setBackHairs);
  }, []);

  const handlePrev = (type: 'face' | 'front' | 'back') => {
    if (type === 'face') setFaceIdx((faceIdx - 1 + faces.length) % faces.length);
    if (type === 'front') setFrontIdx((frontIdx - 1 + frontHairs.length) % frontHairs.length);
    if (type === 'back') setBackIdx((backIdx - 1 + backHairs.length) % backHairs.length);
  };
  const handleNext = (type: 'face' | 'front' | 'back') => {
    if (type === 'face') setFaceIdx((faceIdx + 1) % faces.length);
    if (type === 'front') setFrontIdx((frontIdx + 1) % frontHairs.length);
    if (type === 'back') setBackIdx((backIdx + 1) % backHairs.length);
  };
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/background');
  };

  return (
    <div className="main-container">
      <h1>{texts.characterPartsSelect.title}</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '24px 0' }}>
        <div>
          <div>{texts.characterPartsSelect.face}</div>
          <button onClick={() => handlePrev('face')}>←</button>
          <span style={{ minWidth: 60, display: 'inline-block' }}>{faces.length === 0 ? texts.common.noData : (faces[faceIdx]?.name || '')}</span>
          <button onClick={() => handleNext('face')}>→</button>
        </div>
        <div>
          <div>{texts.characterPartsSelect.frontHair}</div>
          <button onClick={() => handlePrev('front')}>←</button>
          <span style={{ minWidth: 60, display: 'inline-block' }}>{frontHairs.length === 0 ? texts.common.noData : (frontHairs[frontIdx]?.name || '')}</span>
          <button onClick={() => handleNext('front')}>→</button>
        </div>
        <div>
          <div>{texts.characterPartsSelect.backHair}</div>
          <button onClick={() => handlePrev('back')}>←</button>
          <span style={{ minWidth: 60, display: 'inline-block' }}>{backHairs.length === 0 ? texts.common.noData : (backHairs[backIdx]?.name || '')}</span>
          <button onClick={() => handleNext('back')}>→</button>
        </div>
      </div>
      <div style={{ position: 'relative', width: 240, height: 320, margin: '0 auto' }}>
        {/* 後髪 → 顔 → 前髪 の順で重ねる */}
        {backHairs[backIdx] && (
          <img src={API_BASE_URL + backHairs[backIdx].assetPath} alt={texts.characterPartsSelect.backHair} style={{ position: 'absolute', left: 0, top: 0, zIndex: 0, width: 240, height: 320 }} />
        )}
        {faces[faceIdx] && (
          <img src={API_BASE_URL + faces[faceIdx].assetPath} alt={texts.characterPartsSelect.face} style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, width: 240, height: 320 }} />
        )}
        {frontHairs[frontIdx] && (
          <img src={API_BASE_URL + frontHairs[frontIdx].assetPath} alt={texts.characterPartsSelect.frontHair} style={{ position: 'absolute', left: 0, top: 0, zIndex: 2, width: 240, height: 320 }} />
        )}
      </div>
      <form onSubmit={handleNextPage}>
        <button type="submit">{texts.common.next}</button>
      </form>
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default CharacterPartsSelect;
