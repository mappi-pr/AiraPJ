import React, { useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo, StickerInstance } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { getUserId } from '../utils/user';
import axios from 'axios';

// フォトエリアの固定サイズ (3:4のアスペクト比)
const PHOTO_WIDTH = 240;
const PHOTO_HEIGHT = 320;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const Photo: React.FC = () => {
  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  
  // ドラッグ用state
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();
  
  // ピンチズーム用state
  const [isPinching, setIsPinching] = React.useState(false);
  const initialPinchDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const characterRef = useRef<HTMLDivElement>(null);
  
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

  // ステッカー関連state
  const [availableStickers, setAvailableStickers] = React.useState<PartInfo[]>([]);
  const [showStickerPanel, setShowStickerPanel] = React.useState(false);
  const [selectedSticker, setSelectedSticker] = React.useState<number | null>(null);
  const [draggingSticker, setDraggingSticker] = React.useState<number | null>(null);
  const stickerDragOffset = useRef({ x: 0, y: 0 });

  // ドラッグ中のグローバルイベント監視（キャラクター用）
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

  // ステッカードラッグ中のグローバルイベント監視
  React.useEffect(() => {
    if (draggingSticker === null) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      if (!partsContext) return;
      const newStickers = [...partsContext.selectedParts.stickers];
      newStickers[draggingSticker] = {
        ...newStickers[draggingSticker],
        x: clientX - stickerDragOffset.current.x,
        y: clientY - stickerDragOffset.current.y,
      };
      partsContext.setSelectedParts(prev => ({ ...prev, stickers: newStickers }));
    };
    const handleUp = () => setDraggingSticker(null);
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
  }, [draggingSticker, partsContext]);

  // ステッカー一覧の取得
  React.useEffect(() => {
    fetch('/api/sticker')
      .then(res => res.json())
      .then(data => setAvailableStickers(data))
      .catch(err => console.error('Failed to fetch stickers:', err));
  }, []);

  if (!partsContext) return <div>{t.photo.noPartsContext}</div>;
  const { selectedParts, scale, setScale, dragPos, setDragPos } = partsContext;
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
      // 高解像度でキャプチャ（scale=3で720x960の高画質出力）
      const canvas = await html2canvas(photoRef.current, { 
        useCORS: true, 
        background: undefined,
        scale: 3,  // 3倍解像度で高画質出力
        width: PHOTO_WIDTH,
        height: PHOTO_HEIGHT,
        windowWidth: PHOTO_WIDTH,
        windowHeight: PHOTO_HEIGHT
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

  // ステッカー追加
  const handleAddSticker = (sticker: PartInfo) => {
    if (!partsContext) return;
    const newSticker: StickerInstance = {
      sticker,
      x: 120, // 中央
      y: 160,
    };
    partsContext.setSelectedParts(prev => ({
      ...prev,
      stickers: [...prev.stickers, newSticker],
    }));
    setShowStickerPanel(false);
  };

  // ステッカードラッグ開始
  const handleStickerDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    index: number
  ) => {
    e.stopPropagation();
    setSelectedSticker(index);
    setDraggingSticker(index);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (!partsContext) return;
    const sticker = partsContext.selectedParts.stickers[index];
    stickerDragOffset.current = {
      x: clientX - sticker.x,
      y: clientY - sticker.y,
    };
  };

  // ステッカー削除
  const handleRemoveSticker = (index: number) => {
    if (!partsContext) return;
    const newStickers = partsContext.selectedParts.stickers.filter((_, i) => i !== index);
    partsContext.setSelectedParts(prev => ({ ...prev, stickers: newStickers }));
    if (selectedSticker === index) {
      setSelectedSticker(null);
    } else if (selectedSticker !== null && selectedSticker > index) {
      setSelectedSticker(selectedSticker - 1);
    }
  };

  // ステッカークリック（選択）
  const handleStickerClick = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    index: number
  ) => {
    e.stopPropagation();
    setSelectedSticker(index);
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
        {/* ステッカーレイヤー（最前面） */}
        {selectedParts.stickers.map((stickerInstance, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: stickerInstance.x,
              top: stickerInstance.y,
              zIndex: 100 + index,
              cursor: draggingSticker === index ? 'grabbing' : 'grab',
              touchAction: 'none',
              transformOrigin: 'center center',
              border: selectedSticker === index ? '3px solid #4a90e2' : '2px solid transparent',
              borderRadius: '4px',
              boxShadow: selectedSticker === index ? '0 0 10px rgba(74, 144, 226, 0.5)' : 'none',
              transition: 'border 0.2s, box-shadow 0.2s',
              padding: '4px',
            }}
            onMouseDown={(e) => handleStickerDragStart(e, index)}
            onTouchStart={(e) => handleStickerDragStart(e, index)}
            onClick={(e) => handleStickerClick(e, index)}
          >
            <img
              src={API_BASE_URL + stickerInstance.sticker.assetPath}
              alt={stickerInstance.sticker.name}
              style={{ width: 100, height: 100, objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
        ))}
      </div>
      <button onClick={handleDownload}>{t.photo.saveButton}</button>
      {availableStickers.length > 0 && (
        <button onClick={() => setShowStickerPanel(!showStickerPanel)}>
          ステッカー追加
        </button>
      )}
      
      {/* ステッカー選択パネル */}
      {showStickerPanel && (
        <div style={{ 
          margin: '16px 0', 
          padding: '16px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          background: '#f9f9f9' 
        }}>
          <h3>ステッカーを選択</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableStickers.length > 0 ? (
              availableStickers.map(sticker => (
                <div
                  key={sticker.id}
                  onClick={() => handleAddSticker(sticker)}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid #ddd',
                    borderRadius: '4px',
                    padding: '8px',
                    textAlign: 'center',
                    background: 'white',
                  }}
                >
                  <img
                    src={API_BASE_URL + sticker.assetPath}
                    alt={sticker.name}
                    style={{ width: 60, height: 60, objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{sticker.name}</div>
                </div>
              ))
            ) : (
              <div>ステッカーが登録されていません</div>
            )}
          </div>
          <button onClick={() => setShowStickerPanel(false)} style={{ marginTop: '8px' }}>
            閉じる
          </button>
        </div>
      )}
      
      {/* ステッカー管理パネル */}
      {selectedParts.stickers.length > 0 && (
        <div style={{ 
          margin: '16px 0', 
          padding: '16px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          background: '#f0f0f0' 
        }}>
          <h3>配置済みステッカー</h3>
          {selectedParts.stickers.map((stickerInstance, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedSticker(index)}
              style={{ 
                marginBottom: '8px', 
                padding: '8px', 
                background: selectedSticker === index ? '#e3f2fd' : 'white',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: selectedSticker === index ? '2px solid #4a90e2' : '1px solid #ddd',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <img
                src={API_BASE_URL + stickerInstance.sticker.assetPath}
                alt={stickerInstance.sticker.name}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div>{stickerInstance.sticker.name}</div>
              </div>
              <button onClick={() => handleRemoveSticker(index)}>削除</button>
            </div>
          ))}
        </div>
      )}
      
      <nav>
        <Link to="/title">{t.common.backToTitle}</Link>
      </nav>
    </div>
    </PageTransition>
  );
};

export default Photo;
