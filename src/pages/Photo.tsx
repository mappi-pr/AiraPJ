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

const Photo: React.FC = () => {
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

  // ステッカー用state
  const [availableStickers, setAvailableStickers] = React.useState<PartInfo[]>([]);
  const [showStickerPanel, setShowStickerPanel] = React.useState(false);
  const [selectedSticker, setSelectedSticker] = React.useState<number | null>(null);
  const [draggingSticker, setDraggingSticker] = React.useState<number | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const stickerDragOffset = useRef({ x: 0, y: 0 });

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
    const newScale = initialScale.current * scaleChange;
    // スケールを0.5～2の範囲に制限
    return Math.max(0.5, Math.min(2, newScale));
  };

  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);

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
  }, [dragging, partsContext]);

  // ピンチズーム用のグローバルイベント監視
  React.useEffect(() => {
    if (!isPinching || !partsContext) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const currentDistance = getPinchDistance(e.touches);
        const newScale = calculatePinchScale(currentDistance);
        partsContext.setScale(newScale);
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
  }, [isPinching, partsContext]);

  // マウスホイールイベント用のグローバルイベント監視
  React.useEffect(() => {
    const characterElement = characterRef.current;
    if (!characterElement || !partsContext) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      partsContext.setScale(currentScale => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = currentScale + delta;
        // スケールを0.5～2の範囲に制限
        return Math.max(0.5, Math.min(2, newScale));
      });
    };
    
    characterElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      characterElement.removeEventListener('wheel', handleWheel);
    };
  }, [partsContext]);

  // 利用可能なステッカー一覧の取得（未登録なら空のままで、関連UIは表示しない）
  React.useEffect(() => {
    axios.get('/api/sticker')
      .then(res => setAvailableStickers(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch stickers:', err));
  }, []);

  // ステッカードラッグ中のグローバルイベント監視（座標はフォトエリア基準）
  React.useEffect(() => {
    if (draggingSticker === null || !partsContext) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof TouchEvent && e.touches.length > 1) {
        // 2本指以上の場合はドラッグ処理をスキップ
        return;
      }
      const clientX = e instanceof TouchEvent ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const clientY = e instanceof TouchEvent ? (e.touches[0]?.clientY ?? 0) : e.clientY;
      const rect = photoRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clientX - rect.left - stickerDragOffset.current.x;
      const y = clientY - rect.top - stickerDragOffset.current.y;
      partsContext.setSelectedParts(prev => ({
        ...prev,
        stickers: prev.stickers.map((s, i) => (i === draggingSticker ? { ...s, x, y } : s)),
      }));
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

  if (!partsContext) return <div>{t.photo.noPartsContext}</div>;
  const { selectedParts, setSelectedParts, scale, setScale, dragPos, setDragPos } = partsContext;

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    playSuccess();
    if (photoRef.current) {
      // 選択中ステッカーのハイライト（枠・影）が保存画像に写り込まないよう、
      // キャプチャの間だけハイライトを消す
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        // 高解像度でキャプチャ（scale=3で720x960の高画質出力）
        // ステッカーレイヤーはフォトエリア内に描画しているため、このキャプチャに含まれる
        const canvas = await html2canvas(photoRef.current, {
          useCORS: true,
          scale: 3,  // 3倍解像度で高画質出力
          width: PHOTO_WIDTH,
          height: PHOTO_HEIGHT,
          windowWidth: PHOTO_WIDTH,
          windowHeight: PHOTO_HEIGHT
        });

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
      } finally {
        setIsCapturing(false);
      }
    }
  };

  // 位置リセット
  const handleReset = () => {
    playClick();
    setDragPos({ x: 0, y: 0 });
  };

  // ステッカー追加（同じステッカーを複数枚貼ることも可能）
  const handleAddSticker = (sticker: PartInfo) => {
    playClick();
    const instance: StickerInstance = {
      sticker,
      x: PHOTO_WIDTH / 2 - 20,
      y: PHOTO_HEIGHT / 2 - 20,
    };
    setSelectedSticker(selectedParts.stickers.length);
    setSelectedParts(prev => ({ ...prev, stickers: [...prev.stickers, instance] }));
    setShowStickerPanel(false);
  };

  // ステッカードラッグ開始（選択も兼ねる）
  const handleStickerDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    index: number
  ) => {
    e.stopPropagation();
    if ('touches' in e && e.touches.length >= 2) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = photoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const instance = selectedParts.stickers[index];
    stickerDragOffset.current = {
      x: clientX - rect.left - instance.x,
      y: clientY - rect.top - instance.y,
    };
    setSelectedSticker(index);
    setDraggingSticker(index);
  };

  // ステッカー削除
  const handleRemoveSticker = (index: number) => {
    playClick();
    setSelectedParts(prev => ({ ...prev, stickers: prev.stickers.filter((_, i) => i !== index) }));
    setSelectedSticker(prev => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
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
                  left: selectedParts.backHair.offsetX ?? 0,
                  top: selectedParts.backHair.offsetY ?? 0,
                  width: selectedParts.backHair.width ?? PHOTO_WIDTH,
                  height: selectedParts.backHair.height ?? PHOTO_HEIGHT,
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
                  left: selectedParts.costume.offsetX ?? 0,
                  top: selectedParts.costume.offsetY ?? 0,
                  width: selectedParts.costume.width ?? PHOTO_WIDTH,
                  height: selectedParts.costume.height ?? PHOTO_HEIGHT,
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
                  left: selectedParts.face.offsetX ?? 0,
                  top: selectedParts.face.offsetY ?? 0,
                  width: selectedParts.face.width ?? PHOTO_WIDTH,
                  height: selectedParts.face.height ?? PHOTO_HEIGHT,
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
                  left: selectedParts.frontHair.offsetX ?? 0,
                  top: selectedParts.frontHair.offsetY ?? 0,
                  width: selectedParts.frontHair.width ?? PHOTO_WIDTH,
                  height: selectedParts.frontHair.height ?? PHOTO_HEIGHT,
                  zIndex: 4,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
          </div>
          {/* ステッカーレイヤー（最前面）。フォトエリア内に置くことでPNG保存にも含まれる */}
          {selectedParts.stickers.map((instance, index) => (
            <div
              key={`${instance.sticker.id}-${index}`}
              style={{
                position: 'absolute',
                left: instance.x,
                top: instance.y,
                zIndex: 100 + index,
                cursor: draggingSticker === index ? 'grabbing' : 'grab',
                touchAction: 'none',
                outline: !isCapturing && selectedSticker === index ? '3px solid #4a90e2' : 'none',
                boxShadow: !isCapturing && selectedSticker === index ? '0 0 10px rgba(74, 144, 226, 0.5)' : 'none',
              }}
              onMouseDown={(e) => handleStickerDragStart(e, index)}
              onTouchStart={(e) => handleStickerDragStart(e, index)}
            >
              <img
                src={instance.sticker.assetPath}
                alt={instance.sticker.name}
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            </div>
          ))}
        </div>
        <button onClick={handleDownload}>{t.photo.saveButton}</button>
        <button onClick={handleReset}>{t.photo.resetButton}</button>
        {/* ステッカー関連UIは、ステッカーが1件も登録されていない場合は一切表示しない */}
        {availableStickers.length > 0 && (
          <button onClick={() => { playClick(); setShowStickerPanel(prev => !prev); }}>
            {t.photo.stickerAddButton}
          </button>
        )}
        {showStickerPanel && availableStickers.length > 0 && (
          <div style={{
            margin: '16px 0',
            padding: '16px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#f9f9f9',
          }}>
            <h3>{t.photo.stickerSelectTitle}</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableStickers.map(sticker => (
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
                    src={sticker.assetPath}
                    alt={sticker.name}
                    style={{ width: 60, height: 60, objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{sticker.name}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowStickerPanel(false)} style={{ marginTop: '8px' }}>
              {t.photo.stickerCloseButton}
            </button>
          </div>
        )}
        {selectedParts.stickers.length > 0 && (
          <div style={{
            margin: '16px 0',
            padding: '16px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#f0f0f0',
          }}>
            <h3>{t.photo.stickerPlacedTitle}</h3>
            {selectedParts.stickers.map((instance, index) => (
              <div
                key={`${instance.sticker.id}-${index}`}
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
                }}
              >
                <img
                  src={instance.sticker.assetPath}
                  alt={instance.sticker.name}
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
                <div style={{ flex: 1 }}>{instance.sticker.name}</div>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveSticker(index); }}>
                  {t.photo.stickerRemoveButton}
                </button>
              </div>
            ))}
          </div>
        )}
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Photo;
