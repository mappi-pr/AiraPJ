import React, { useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

// フォトエリアの固定サイズ (3:4のアスペクト比)
const PHOTO_WIDTH = 240;
const PHOTO_HEIGHT = 320;

const Photo: React.FC = () => {
  // ドラッグ用state
  const [dragPos, setDragPos] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();
  
  // ピンチズーム用state
  const [isPinching, setIsPinching] = React.useState(false);
  const initialPinchDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const characterRef = useRef<HTMLDivElement>(null);
  
  // Context取得
  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  if (!partsContext) return <div>{t.photo.noPartsContext}</div>;
  const { selectedParts, scale, setScale } = partsContext;

  // ピンチズーム距離計算
  const getPinchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // スケール計算の共通関数
  const calculatePinchScale = (currentDistance: number) => {
    if (initialPinchDistance.current === 0) return 1;
    const scaleChange = currentDistance / initialPinchDistance.current;
    let newScale = initialScale.current * scaleChange;
    // スケールを0.5～2の範囲に制限
    return Math.max(0.5, Math.min(2, newScale));
  };

  // ドラッグ中のグローバルイベント監視
  React.useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof TouchEvent && e.touches.length > 1) {
        // 2本指以上の場合はドラッグ処理をスキップ
        return;
      }
      let clientX, clientY;
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDragPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      });
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

  // ピンチズーム用のグローバルイベント監視
  React.useEffect(() => {
    if (!isPinching) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const currentDistance = getPinchDistance(e.touches);
        const newScale = calculatePinchScale(currentDistance);
        setScale(newScale);
        e.preventDefault();
      } else {
        // 2本指未満の場合はピンチモード終了
        setIsPinching(false);
      }
    };
    const handleTouchEnd = () => {
      setIsPinching(false);
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPinching, setScale]);

  // マウスホイールイベント用のグローバルイベント監視
  React.useEffect(() => {
    const characterElement = characterRef.current;
    if (!characterElement) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(currentScale => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        let newScale = currentScale + delta;
        // スケールを0.5～2の範囲に制限
        return Math.max(0.5, Math.min(2, newScale));
      });
    };
    
    characterElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      characterElement.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    playSuccess();
    if (photoRef.current) {
      // html2canvasで一旦キャプチャ
      const sourceCanvas = await html2canvas(photoRef.current, { 
        useCORS: true, 
        background: undefined,
        scale: window.devicePixelRatio * 2
      } as any );
      
      // 正しいアスペクト比(3:4)でリサイズ
      const targetCanvas = document.createElement('canvas');
      const targetScale = 2; // 高解像度出力用
      targetCanvas.width = PHOTO_WIDTH * targetScale;
      targetCanvas.height = PHOTO_HEIGHT * targetScale;
      
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get 2d context');
        return;
      }
      
      // ソースキャンバスを正しいアスペクト比で描画
      ctx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
      
      const link = document.createElement('a');
      link.download = 'my_character.png';
      link.href = targetCanvas.toDataURL();
      link.click();
    }
  };

  // 位置リセット
  const handleReset = () => {
    playClick();
    setDragPos({ x: 0, y: 0 });
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // タッチイベントで2本指以上の場合はピンチズーム
    if ('touches' in e && e.touches.length >= 2) {
      handlePinchStart(e);
      return;
    }
    setDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - dragPos.x,
      y: clientY - dragPos.y,
    };
  };

  // ピンチズーム開始
  const handlePinchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2) {
      setIsPinching(true);
      setDragging(false); // ドラッグをキャンセル
      initialPinchDistance.current = getPinchDistance(e.touches);
      initialScale.current = scale;
      e.preventDefault();
    }
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
            {scale.toFixed(2)}{t.photo.scaleSuffix}
          </label>
        </div>
        <div
          ref={photoRef}
          style={{
            position: 'relative',
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
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
                width: PHOTO_WIDTH,
                height: PHOTO_HEIGHT,
                zIndex: 0,
                objectFit: 'cover',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          ) : (
            <div style={{position:'absolute',left:0,top:0,width:PHOTO_WIDTH,height:PHOTO_HEIGHT,zIndex:0,background:'#ccc',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>{t.photo.noBackground}</div>
          )}
          {/* パーツ重ね順: 後髪→衣装→顔→前髪 */}
          <div
            ref={characterRef}
            style={{
              position: 'absolute',
              left: dragPos.x,
              top: dragPos.y,
              width: PHOTO_WIDTH,
              height: PHOTO_HEIGHT,
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
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
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
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
                  zIndex: 2,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            ) : (
              <div style={{position:'absolute',left:0,top:0,width:PHOTO_WIDTH,height:PHOTO_HEIGHT,zIndex:2,background:'rgba(255,255,255,0.2)',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>{t.photo.noCostume}</div>
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
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
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
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
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
