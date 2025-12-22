# ボイス実装ガイド

このドキュメントでは、AiraPJにおけるボイス（音声）機能の実装方法について詳しく説明します。

## 目次

- [概要](#概要)
- [ボイスファイルの配置](#ボイスファイルの配置)
- [キャラクター選択画面でのボイス実装](#キャラクター選択画面でのボイス実装)
  - [実装の全体像](#実装の全体像)
  - [ステップ1: ボイスファイルの準備](#ステップ1-ボイスファイルの準備)
  - [ステップ2: useSoundフックの拡張](#ステップ2-usesoundフックの拡張)
  - [ステップ3: CharacterPartsSelectコンポーネントの更新](#ステップ3-characterpartsselectコンポーネントの更新)
- [高度な実装パターン](#高度な実装パターン)
- [トラブルシューティング](#トラブルシューティング)
- [ベストプラクティス](#ベストプラクティス)

---

## 概要

AiraPJでは、以下のようなボイス機能を実装できます：

- **キャラクター選択時のボイス**: ユーザーがキャラクターパーツ（顔・前髪・後髪）を切り替える際に再生
- **確定時のボイス**: 選択を確定して次の画面に進む際に再生
- **その他のボイス**: 背景選択、衣装選択など、他の画面でのボイス再生

### 技術要件

- **対応フォーマット**: MP3形式（推奨）、OGG、WAVなど、HTML5 Audioでサポートされる形式
- **ファイルサイズ**: できるだけ小さく（100KB〜500KB程度を推奨）
- **サンプリングレート**: 44.1kHz または 48kHz
- **ビットレート**: 128kbps〜192kbps（音声は128kbpsで十分）

---

## ボイスファイルの配置

ボイスファイルは `src/assets/sound/voice/` ディレクトリ配下に配置します。

### ディレクトリ構成

```
src/assets/sound/voice/
├── character/              # キャラクター関連のボイス
│   ├── select/            # 選択中（カーソル移動時）のボイス
│   │   ├── face_01.mp3
│   │   ├── face_02.mp3
│   │   ├── hair_01.mp3
│   │   └── ...
│   └── confirm/           # 確定時のボイス
│       ├── confirm_01.mp3
│       └── confirm_02.mp3
├── background/            # 背景選択時のボイス（オプション）
├── costume/               # 衣装選択時のボイス（オプション）
└── common/                # 共通ボイス（オプション）
    ├── welcome.mp3
    └── thankyou.mp3
```

### ファイル命名規則

- **機能を明確にする**: `select_face_01.mp3`, `confirm_character.mp3` など
- **連番を使用**: 複数バリエーションがある場合は `_01`, `_02` のように連番を付ける
- **キャラクター別**: 複数キャラクターがいる場合は `chara1_select.mp3`, `chara2_select.mp3` のように区別

---

## キャラクター選択画面でのボイス実装

### 実装の全体像

キャラクター選択画面（`CharacterPartsSelect.tsx`）にボイス機能を追加するには、以下の手順を実行します：

1. ボイスファイルを `voice/character/` ディレクトリに配置
2. `useSound` フックを拡張してボイス再生機能を追加
3. `CharacterPartsSelect` コンポーネントでボイス再生を実装

---

### ステップ1: ボイスファイルの準備

#### 1-1. ボイスファイルの配置

以下のようなボイスファイルを準備し、適切なディレクトリに配置します：

**選択中のボイス（`voice/character/select/` に配置）:**
- `select_face.mp3` - 顔を切り替えた時のボイス
- `select_hair.mp3` - 髪を切り替えた時のボイス
- または共通の `select.mp3`

**確定時のボイス（`voice/character/confirm/` に配置）:**
- `confirm.mp3` - 選択を確定する時のボイス

```bash
# ファイル配置例
src/assets/sound/voice/
├── character/
│   ├── select/
│   │   ├── select_face.mp3      # 顔選択時「これはどう？」
│   │   ├── select_front_hair.mp3  # 前髪選択時「こっちもいいね」
│   │   ├── select_back_hair.mp3   # 後髪選択時「似合うかな？」
│   │   └── select_common.mp3    # 共通「うん、これで」
│   └── confirm/
│       └── confirm.mp3           # 確定時「決まり！」
```

#### 1-2. .gitignoreの確認

ボイスファイルはリポジトリサイズを管理するため、`.gitignore` に含まれています。
ローカル開発環境や本番環境に直接配置してください。

---

### ステップ2: useSoundフックの拡張

`src/utils/useSound.ts` を更新して、ボイス再生機能を追加します。

#### 実装例：基本的なボイス再生機能

```typescript
import { useRef } from 'react';

/**
 * Custom hook for playing sound effects and voices
 */
export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  // Check if sound effects are enabled
  const isSoundEnabled = () => localStorage.getItem('seOn') === '1';

  // Initialize AudioContext if needed
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playClick = () => {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Create a pleasant click sound
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const playSuccess = () => {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    
    // Play a two-note success sound
    [523, 659].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = ctx.currentTime + (i * 0.1);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  };

  /**
   * ボイスファイルを再生する
   * @param voicePath - ボイスファイルのパス（例: './assets/sound/voice/character/select/select_face.mp3'）
   * @param volume - ボリューム（0.0〜1.0、デフォルト: 0.7）
   */
  const playVoice = (voicePath: string, volume: number = 0.7) => {
    if (!isSoundEnabled()) return;

    // 既に再生中のボイスがあれば停止
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }

    // 新しいAudioオブジェクトを作成して再生
    try {
      const audio = new Audio(voicePath);
      audio.volume = volume;
      voiceAudioRef.current = audio;
      
      audio.play().catch(err => {
        console.warn('Voice playback failed:', err);
      });
    } catch (err) {
      console.warn('Failed to create voice audio:', err);
    }
  };

  /**
   * ランダムなボイスを再生する（複数のボイスファイルがある場合）
   * @param voicePaths - ボイスファイルのパス配列
   * @param volume - ボリューム（0.0〜1.0、デフォルト: 0.7）
   */
  const playRandomVoice = (voicePaths: string[], volume: number = 0.7) => {
    if (!isSoundEnabled() || voicePaths.length === 0) return;

    const randomIndex = Math.floor(Math.random() * voicePaths.length);
    playVoice(voicePaths[randomIndex], volume);
  };

  return { playClick, playSuccess, playVoice, playRandomVoice };
};
```

---

### ステップ3: CharacterPartsSelectコンポーネントの更新

`src/pages/CharacterPartsSelect.tsx` を更新して、ボイス再生を実装します。

#### 実装例：選択中・確定時のボイス再生

```typescript
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

// ボイスファイルのインポート
// 注意: 実際のファイルが配置されるまではコメントアウトしておく
// import selectFaceVoice from '../assets/sound/voice/character/select/select_face.mp3';
// import selectFrontHairVoice from '../assets/sound/voice/character/select/select_front_hair.mp3';
// import selectBackHairVoice from '../assets/sound/voice/character/select/select_back_hair.mp3';
// import confirmVoice from '../assets/sound/voice/character/confirm/confirm.mp3';

const CharacterPartsSelect: React.FC = () => {
  const [faces, setFaces] = useState<PartInfo[]>([]);
  const [frontHairs, setFrontHairs] = useState<PartInfo[]>([]);
  const [backHairs, setBackHairs] = useState<PartInfo[]>([]);
  const [faceIdx, setFaceIdx] = useState(0);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const navigate = useNavigate();
  const partsContext = useContext(PartsContext);
  const { playClick, playSuccess, playVoice } = useSound();
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
    
    if (type === 'face') {
      setFaceIdx((faceIdx - 1 + faces.length) % faces.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectFaceVoice);
    }
    if (type === 'front') {
      setFrontIdx((frontIdx - 1 + frontHairs.length) % frontHairs.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectFrontHairVoice);
    }
    if (type === 'back') {
      setBackIdx((backIdx - 1 + backHairs.length) % backHairs.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectBackHairVoice);
    }
  };

  const handleNext = (type: 'face' | 'front' | 'back') => {
    playClick();
    
    if (type === 'face') {
      setFaceIdx((faceIdx + 1) % faces.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectFaceVoice);
    }
    if (type === 'front') {
      setFrontIdx((frontIdx + 1) % frontHairs.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectFrontHairVoice);
    }
    if (type === 'back') {
      setBackIdx((backIdx + 1) % backHairs.length);
      // ボイス再生（ファイルが配置されている場合）
      // playVoice(selectBackHairVoice);
    }
  };

  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    
    // 確定時のボイス再生（ファイルが配置されている場合）
    // playVoice(confirmVoice);
    
    // ボイス再生が完了するまで少し待ってから遷移（オプション）
    // setTimeout(() => {
    //   navigate('/background');
    // }, 500);
    
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
```

---

## 高度な実装パターン

### パターン1: 複数のボイスをランダム再生

キャラクターに複数のボイスバリエーションを持たせる場合：

```typescript
// ボイスファイルのインポート
import selectVoice1 from '../assets/sound/voice/character/select/select_01.mp3';
import selectVoice2 from '../assets/sound/voice/character/select/select_02.mp3';
import selectVoice3 from '../assets/sound/voice/character/select/select_03.mp3';

const CharacterPartsSelect: React.FC = () => {
  // ... 既存のコード ...
  
  const { playClick, playSuccess, playRandomVoice } = useSound();
  
  // 選択中のボイスリスト
  const selectVoices = [selectVoice1, selectVoice2, selectVoice3];
  
  const handleNext = (type: 'face' | 'front' | 'back') => {
    playClick();
    
    // ランダムにボイスを再生
    playRandomVoice(selectVoices);
    
    if (type === 'face') setFaceIdx((faceIdx + 1) % faces.length);
    if (type === 'front') setFrontIdx((frontIdx + 1) % frontHairs.length);
    if (type === 'back') setBackIdx((backIdx + 1) % backHairs.length);
  };
  
  // ... 既存のコード ...
};
```

### パターン2: キャラクター別のボイス

複数のキャラクターがいて、それぞれ異なるボイスを持つ場合：

```typescript
// キャラクターIDごとのボイス設定
const characterVoices = {
  'character1': {
    select: [selectChar1Voice1, selectChar1Voice2],
    confirm: confirmChar1Voice,
  },
  'character2': {
    select: [selectChar2Voice1, selectChar2Voice2],
    confirm: confirmChar2Voice,
  },
};

const CharacterPartsSelect: React.FC = () => {
  // 現在選択中のキャラクターID
  const currentCharacterId = 'character1'; // 実際には状態管理から取得
  
  const handleNext = (type: 'face' | 'front' | 'back') => {
    playClick();
    
    // 現在のキャラクターのボイスを再生
    const voices = characterVoices[currentCharacterId]?.select || [];
    playRandomVoice(voices);
    
    // ... パーツ切り替えロジック ...
  };
  
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    
    // 現在のキャラクターの確定ボイスを再生
    const confirmVoice = characterVoices[currentCharacterId]?.confirm;
    if (confirmVoice) {
      playVoice(confirmVoice);
    }
    
    // ボイス再生完了を待ってから遷移
    setTimeout(() => {
      navigate('/background');
    }, 800);
  };
};
```

### パターン3: ボイスの頻度制御

毎回ボイスを再生するのではなく、一定確率で再生する場合：

```typescript
const handleNext = (type: 'face' | 'front' | 'back') => {
  playClick();
  
  // 50%の確率でボイスを再生
  if (Math.random() < 0.5) {
    playRandomVoice(selectVoices);
  }
  
  // ... パーツ切り替えロジック ...
};
```

### パターン4: 連続再生の防止

短時間に連続でボタンを押された場合の制御：

```typescript
const CharacterPartsSelect: React.FC = () => {
  const [lastVoiceTime, setLastVoiceTime] = useState(0);
  const VOICE_COOLDOWN = 1000; // 1秒のクールダウン
  
  const handleNext = (type: 'face' | 'front' | 'back') => {
    playClick();
    
    // クールダウン中でなければボイス再生
    const now = Date.now();
    if (now - lastVoiceTime > VOICE_COOLDOWN) {
      playRandomVoice(selectVoices);
      setLastVoiceTime(now);
    }
    
    // ... パーツ切り替えロジック ...
  };
};
```

---

## トラブルシューティング

### ボイスが再生されない

**原因1: SEがOFFになっている**
- 画面右上の「SE: OFF」ボタンを「SE: ON」に切り替えてください
- ボイスもSE設定に依存しています

**原因2: ファイルパスが正しくない**
- インポート文のパスが実際のファイル配置と一致しているか確認
- Viteでは相対パスでインポートする必要があります

**原因3: ブラウザのautoplay制限**
- 最初のユーザーインタラクション前は自動再生がブロックされる場合があります
- ボタンクリックなどのユーザー操作に応じた再生は通常問題ありません

**原因4: ファイル形式の問題**
- すべてのブラウザでサポートされるMP3形式を使用してください
- ファイルが破損していないか確認してください

### ボイスが途切れる・重なる

**解決方法:**
- `playVoice` 関数内で既存の再生を停止する処理が含まれています
- 連続再生防止パターン（パターン4）を使用してください

### ボリュームが大きすぎる・小さすぎる

**解決方法:**
```typescript
// ボリュームを調整（0.0〜1.0）
playVoice(voicePath, 0.5); // 50%のボリューム
```

---

## ベストプラクティス

### 1. ファイルサイズの最適化

- **圧縮**: 音声ファイルは適切に圧縮してください（128kbps推奨）
- **長さ**: 1〜3秒程度の短いボイスが理想的です
- **無音削除**: ファイルの前後の無音部分をトリミングしてください

### 2. ユーザー体験の配慮

- **頻度**: 毎回再生すると煩わしいため、ランダム再生や確率制御を検討
- **ボリューム**: BGMより小さめに設定（0.5〜0.7程度）
- **キャンセル可能**: 長いボイスの場合、途中でキャンセルできるようにする

### 3. パフォーマンス

- **プリロード**: 頻繁に使用するボイスは事前にロードを検討
- **遅延ロード**: 使用頻度が低いボイスは動的インポートを検討

```typescript
// 動的インポートの例
const playSelectVoice = async () => {
  const { default: voicePath } = await import('../assets/sound/voice/character/select/select.mp3');
  playVoice(voicePath);
};
```

### 4. アクセシビリティ

- **字幕**: ボイスの内容を視覚的にも表示することを検討
- **スキップ機能**: ボイス再生をスキップできるオプションを提供

### 5. テスト

- **複数ブラウザ**: Chrome, Firefox, Safari, Edgeで動作確認
- **モバイル**: スマートフォンでも正しく再生されるか確認
- **SE設定**: SE ON/OFF両方の状態で動作確認

---

## まとめ

このガイドに従って、キャラクター選択画面にボイス機能を実装できます。

### 実装の流れ

1. ✅ ボイスファイルを `src/assets/sound/voice/character/` に配置
2. ✅ `useSound.ts` にボイス再生機能を追加
3. ✅ `CharacterPartsSelect.tsx` でボイスを再生
4. ✅ テストして動作確認

### 重要なポイント

- SEがONの時のみボイスが再生されます
- ボイスファイルは `.gitignore` に含まれるため、各環境で個別に配置が必要です
- ユーザー体験を考慮して、適切な頻度とボリュームで再生してください

ご不明な点がありましたら、このドキュメントを参照するか、開発チームにお問い合わせください。

---

最終更新: 2025-12-22
