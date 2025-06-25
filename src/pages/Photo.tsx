import React, { useContext, useRef } from 'react';
import texts from '../locales/ja.json';
import { PartsContext } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const Photo: React.FC = () => {
  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  if (!partsContext) return <div>パーツ情報が取得できません</div>;
  const { selectedParts, scale, setScale } = partsContext;

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    if (photoRef.current) {
      const canvas = await html2canvas(photoRef.current, { useCORS: true, background: undefined });
      const link = document.createElement('a');
      link.download = 'my_character.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="main-container">
      <h1>{texts.photo.title}</h1>
      <div style={{ margin: '16px 0' }}>
        <label>
          拡大率
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.01}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
          />
          {scale}倍
        </label>
      </div>
      <div
        ref={photoRef}
        style={{
          position: 'relative',
          width: 240,
          height: 320,
          background: '#eee',
          margin: '0 auto',
        }}
      >
        {/* 背景（固定） */}
        {selectedParts.background ? (
          <img
            src={API_BASE_URL + selectedParts.background.assetPath}
            alt="背景"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 240,
              height: 320,
              zIndex: 0,
            }}
          />
        ) : (
          <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:0,background:'#ccc',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>背景未選択</div>
        )}
        {/* 衣装＋顔系パーツ（拡縮グループ） */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 240,
            height: 320,
            zIndex: 1,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {selectedParts.costume ? (
            <img
              src={API_BASE_URL + selectedParts.costume.assetPath}
              alt="衣装"
              style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 320, zIndex: 1 }}
            />
          ) : (
            <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:1,background:'rgba(255,255,255,0.2)',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>衣装未選択</div>
          )}
          {selectedParts.backHair && (
            <img
              src={API_BASE_URL + selectedParts.backHair.assetPath}
              alt="後髪"
              style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 320, zIndex: 2 }}
            />
          )}
          {selectedParts.face && (
            <img
              src={API_BASE_URL + selectedParts.face.assetPath}
              alt="顔"
              style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 320, zIndex: 3 }}
            />
          )}
          {selectedParts.frontHair && (
            <img
              src={API_BASE_URL + selectedParts.frontHair.assetPath}
              alt="前髪"
              style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 320, zIndex: 4 }}
            />
          )}
        </div>
      </div>
      <button onClick={handleDownload}>PNGで保存</button>
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default Photo;
