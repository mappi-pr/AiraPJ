import React, { useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { getUserId } from '../utils/user';
import axios from 'axios';

const Photo: React.FC = () => {
  // ドラッグ用state
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

  // ドラッグ中のグローバルイベント監視
  React.useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      if (partsContext) {
        partsContext.setDragPos({
          x: clientX - dragOffset.current.x,
          y: clientY - dragOffset.current.y,
        });
      }
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging]);

  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  if (!partsContext) return <div>{t.photo.noPartsContext}</div>;
  const { selectedParts, scale, setScale } = partsContext;

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    playSuccess();
    if (photoRef.current) {
      const canvas = await html2canvas(photoRef.current, { 
        useCORS: true, 
        background: undefined,
        scale: window.devicePixelRatio * 2
      } as any );
      const link = document.createElement('a');
      link.download = 'my_character.png';
      link.href = canvas.toDataURL();
      link.click();

      // Save generation history
      try {
        const userId = getUserId();
        await axios.post('/api/generation-history', {
          userId,
          backgroundId: selectedParts.background?.id || null,
          costumeId: selectedParts.costume?.id || null,
          backHairId: selectedParts.backHair?.id || null,
          faceId: selectedParts.face?.id || null,
          frontHairId: selectedParts.frontHair?.id || null,
          scale,
          dragX: dragPos.x,
          dragY: dragPos.y,
        });
        console.log('Generation history saved');
      } catch (error) {
        console.error('Failed to save generation history:', error);
      }
    }
  };

  // 位置リセット
  const handleReset = () => {
    playClick();
    setDragPos({ x: 0, y: 0 });
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - dragPos.x,
      y: clientY - dragPos.y,
    };
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.photo.title}</h1>
        <div style={{ margin: '16px 0' }}>
          <label>
            {t.photo.scaleLabel}
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.01}
              value={scale}
              onChange={e => setScale(Number(e.target.value))}
            />
            {scale}{t.photo.scaleSuffix}
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
            overflow: 'hidden',
          }}
        >
          {/* 背景（固定） */}
          {selectedParts.background ? (
            <img
              src={selectedParts.background.assetPath}
              alt="background"
              crossOrigin="anonymous"
              draggable={false}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240,
                height: 320,
                zIndex: 0,
                objectFit: 'cover',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          ) : (
            <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:0,background:'#ccc',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>{t.photo.noBackground}</div>
          )}
          {/* パーツ重ね順: 後髪→衣装→顔→前髪 */}
          <div
            style={{
              position: 'absolute',
              left: dragPos.x,
              top: dragPos.y,
              width: 240,
              height: 320,
              zIndex: 1,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {selectedParts.backHair && (
              <img
                src={selectedParts.backHair.assetPath}
                alt="back hair"
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 240,
                  height: 320,
                  zIndex: 1,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
            {selectedParts.costume ? (
              <img
                src={selectedParts.costume.assetPath}
                alt="costume"
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 240,
                  height: 320,
                  zIndex: 2,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            ) : (
              <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:2,background:'rgba(255,255,255,0.2)',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>{t.photo.noCostume}</div>
            )}
            {selectedParts.face && (
              <img
                src={selectedParts.face.assetPath}
                alt="face"
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 240,
                  height: 320,
                  zIndex: 3,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
            {selectedParts.frontHair && (
              <img
                src={selectedParts.frontHair.assetPath}
                alt="front hair"
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 240,
                  height: 320,
                  zIndex: 4,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
          </div>
        </div>
        <button onClick={handleDownload}>{t.photo.saveButton}</button>
        <button onClick={handleReset}>{t.photo.resetButton}</button>
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Photo;
