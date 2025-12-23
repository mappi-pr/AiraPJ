import React, { useEffect, useState, useRef } from 'react';
import texts from '../locales/ja.json';

// 画像トリミング時の透明度判定閾値（アルファ値がこの値以下のピクセルを透明とみなす）
const ALPHA_THRESHOLD = 16;

// トリミング結果のキャッシュ（URL → トリミング済みDataURL）
const trimCache = new Map<string, string>();
const MAX_TRIM_CACHE_SIZE = 100;

// 画像の余白（透明部分）をトリミングしてBase64で返す（最適化版）
const trimImage = (src: string): Promise<string> => {
  // キャッシュチェック
  if (trimCache.has(src)) {
    return Promise.resolve(trimCache.get(src)!);
  }

  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const { data, width, height } = imageData;
      
      let top = height, left = width, right = 0, bottom = 0;
      
      // 最適化: 上から下へスキャンしてtopを見つける（早期終了）
      topLoop: for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > ALPHA_THRESHOLD) {
            top = y;
            break topLoop;
          }
        }
      }
      
      // 最適化: 下から上へスキャンしてbottomを見つける（早期終了）
      bottomLoop: for (let y = height - 1; y >= top; y--) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > ALPHA_THRESHOLD) {
            bottom = y;
            break bottomLoop;
          }
        }
      }
      
      // 最適化: 左から右へスキャンしてleftを見つける（早期終了）
      leftLoop: for (let x = 0; x < width; x++) {
        for (let y = top; y <= bottom; y++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > ALPHA_THRESHOLD) {
            left = x;
            break leftLoop;
          }
        }
      }
      
      // 最適化: 右から左へスキャンしてrightを見つける（早期終了）
      rightLoop: for (let x = width - 1; x >= left; x--) {
        for (let y = top; y <= bottom; y++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > ALPHA_THRESHOLD) {
            right = x;
            break rightLoop;
          }
        }
      }
      
      if (right < left || bottom < top) return resolve(src); // 全部透明
      
      const w = right - left + 1;
      const h = bottom - top + 1;
      const trimCanvas = document.createElement('canvas');
      trimCanvas.width = w;
      trimCanvas.height = h;
      const trimCtx = trimCanvas.getContext('2d');
      if (!trimCtx) return resolve(src);
      trimCtx.drawImage(canvas, left, top, w, h, 0, 0, w, h);
      const result = trimCanvas.toDataURL();
      
      // キャッシュに保存（サイズ制限付き）
      if (trimCache.size >= MAX_TRIM_CACHE_SIZE) {
        // 最も古いエントリを削除（先頭）
        const firstKey = trimCache.keys().next().value;
        if (firstKey) trimCache.delete(firstKey);
      }
      trimCache.set(src, result);
      
      resolve(result);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Placeholder image for broken/missing images
const PLACEHOLDER_IMAGE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPg==';

// パーツ型
export type PartInfo = {
  id: number;
  name: string;
  thumbUrl: string; // サムネイル画像
  imageUrl: string; // 高解像度画像
  assetPath?: string; // API返却の画像パス（例: '/images/xxx.png'）
  imagePath?: string;
};

// キャッシュ用（TTL & サイズ制限付き）
type PartsCacheEntry = {
  data: PartInfo[];
  timestamp: number;
};

const PARTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5分で期限切れ
const PARTS_CACHE_MAX_ENTRIES = 50;       // キャッシュする最大キー数
const INFINITE_SCROLL_THRESHOLD_PX = 10;  // 無限スクロール発火の閾値（下端からのピクセル数）

const internalPartsCache: { [key: string]: PartsCacheEntry } = {};

const partsCache = new Proxy(internalPartsCache, {
  get(target, prop: string) {
    const entry = target[prop];
    if (!entry) return undefined;
    const now = Date.now();
    if (now - entry.timestamp > PARTS_CACHE_TTL_MS) {
      // 期限切れなら削除して未定義として扱う
      delete target[prop];
      return undefined;
    }
    return entry.data;
  },
  set(target, prop: string, value: PartInfo[]) {
    const now = Date.now();
    target[prop] = { data: value, timestamp: now };

    // エントリー数が多すぎる場合は古いものから削除
    const keys = Object.keys(target);
    if (keys.length > PARTS_CACHE_MAX_ENTRIES) {
      keys
        .sort((a, b) => target[a].timestamp - target[b].timestamp)
        .slice(0, keys.length - PARTS_CACHE_MAX_ENTRIES)
        .forEach((key) => {
          delete target[key];
        });
    }

   return true;
  },
}) as unknown as { [key: string]: PartInfo[] };

interface Props {
  partType: 'face' | 'frontHair' | 'backHair';
  selectedId: number | null;
  onSelect: (part: PartInfo) => void;
}

const getImageSrc = (part: PartInfo): string => {
  // Helper function to format URL with API base if needed
  const formatUrl = (url: string): string => {
    return url.startsWith('http') ? url : API_BASE_URL + url;
  };

  // Check properties in priority order
  const urlSource = part.assetPath || part.imagePath || part.thumbUrl || part.imageUrl;
  return urlSource ? formatUrl(urlSource) : '';
};


const CharacterPartsPanel: React.FC<Props> = ({ partType, selectedId, onSelect }) => {
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // タブ切り替え時にページをリセット
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setParts([]);
  }, [partType]);

  // 非同期でパーツ一覧取得（キャッシュ活用）
  useEffect(() => {
    setFetchError(false); // タブ切り替え時はエラー解除
    const key = `${partType}-page${page}`;
    if (partsCache[key]) {
      setParts(partsCache[key]);
      setHasMore(partsCache[key].length > 0);
      return;
    }
    setLoading(true);
    // partTypeをAPIエンドポイント名に変換（frontHair→front-hair等）
    const apiName = partType === 'frontHair' ? 'front-hair' : partType === 'backHair' ? 'back-hair' : partType;
    fetch(`${API_BASE_URL}/api/${apiName}?page=${page}`)
      .then(res => {
        if (!res.ok) throw new Error('API取得失敗');
        return res.json();
      })
      .then((data: PartInfo[]) => {
        partsCache[key] = data;
        setParts(data);
        setHasMore(data.length > 0);
      })
      .catch(() => {
        setParts([]);
        setHasMore(false);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [partType, page]);

  // インフィニットスクロール（下部に到達時に追加ロード）
  useEffect(() => {
    const handleScroll = () => {
      if (!panelRef.current || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = panelRef.current;
      if (scrollTop + clientHeight >= scrollHeight - INFINITE_SCROLL_THRESHOLD_PX) {
        setPage(p => p + 1);
      }
    };
    const ref = panelRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [loading, hasMore]);

  // パネル横幅から最大表示数を算出し、表示件数がそれ未満なら左寄せ
  // 画面幅でgapを調整
  const [gap, setGap] = useState(14);
  useEffect(() => {
    const updateGap = () => {
      setGap(window.innerWidth < 600 ? 22 : 14);
    };
    updateGap();
    window.addEventListener('resize', updateGap);
    return () => window.removeEventListener('resize', updateGap);
  }, []);
  const panelStyle: React.CSSProperties = {
    height: 180,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
    gap,
    alignItems: 'start',
  };
  return (
    <div style={panelStyle} ref={panelRef}>
      {/* API取得失敗時のみエラー表示 */}
      {fetchError && (
        <div style={{ color: '#c00', fontSize: 13 }}>{texts.common.fetchError}</div>
      )}
      {/* データなし時の表示 */}
      {!loading && !fetchError && parts.length === 0 && (
        <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{texts.common.noData}</div>
      )}
      {parts.map(part => (
        <TrimmedButton
          key={part.id}
          part={part}
          selected={part.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      {loading && <div>{texts.common.loading}</div>}
    </div>
  );
};

// 画像余白トリミング済みボタン
interface TrimmedButtonProps {
  part: PartInfo;
  selected: boolean;
  onSelect: (p: PartInfo) => void;
}
const TrimmedButton: React.FC<TrimmedButtonProps> = ({ part, selected, onSelect }) => {
  const [trimmedSrc, setTrimmedSrc] = useState<string>('');
  const [isTrimming, setIsTrimming] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    const src = getImageSrc(part);
    
    // Check if already cached before showing spinner
    if (trimCache.has(src)) {
      setTrimmedSrc(trimCache.get(src)!);
      setIsTrimming(false);
      return;
    }
    
    setIsTrimming(true);
    trimImage(src).then(dataUrl => { 
      if (mounted) {
        setTrimmedSrc(dataUrl);
        setIsTrimming(false);
      }
    });
    return () => { mounted = false; };
  }, [part]);
  
  return (
    <button
      type="button"
      style={{
        border: selected ? '2px solid #646cff' : '1px solid #ccc',
        borderRadius: 12,
        background: '#fff',
        padding: 0,
        cursor: 'pointer',
        width: '100%',
        aspectRatio: '1 / 1',
        minWidth: 64,
        minHeight: 64,
        maxWidth: 120,
        maxHeight: 120,
        display: 'block',
        boxSizing: 'border-box',
        position: 'relative',
      }}
      onClick={(e) => { e.preventDefault(); onSelect(part); }}
      title={part.name}
    >
      {isTrimming && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 6,
          zIndex: 1,
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #646cff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <img
        src={trimmedSrc || getImageSrc(part)}
        alt=""
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, background: '#eee' }}
        onError={e => {
          const img = e.currentTarget;
          img.onerror = null;
          // Set a safe placeholder image instead of an empty src to avoid further error events.
          img.src = PLACEHOLDER_IMAGE_DATA_URL;
          img.style.background = '#ccc';
        }}
      />
    </button>
  );
};

export default CharacterPartsPanel;
