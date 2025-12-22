# サウンドアセットディレクトリ

このディレクトリにはアプリケーションで使用するオーディオファイルを配置します。

## ディレクトリ構成

```
sound/
├── bgm/          # BGM（背景音楽）ファイル
│   └── main.mp3  # メインBGM（ここにファイルを配置）
├── se/           # SE（効果音）ファイル
│   └── *.mp3     # 効果音ファイル
└── voice/        # ボイス（音声）ファイル
    ├── character/     # キャラクター選択時のボイス
    │   ├── select/    # 選択中（カーソル移動時）のボイス
    │   └── confirm/   # 確定時のボイス
    └── *.mp3          # その他のボイスファイル
```

## BGMの追加方法

1. 背景音楽のMP3ファイルを `bgm/main.mp3` に配置します
2. `src/App.tsx` を更新してファイルをインポートします：
   ```typescript
   import bgmpath from './assets/sound/bgm/main.mp3';
   ```
3. 空文字列の定数をインポートに置き換えます

## SEの追加方法

1. 効果音のMP3ファイルを `se/` ディレクトリに配置します（例: `se/click.mp3`）
2. 使用したい画面・コンポーネントでファイルをインポートします：
   ```typescript
   import clickSound from './assets/sound/se/click.mp3';
   ```
3. `useSound` フックを拡張するか、直接 `Audio` オブジェクトを使用して再生します

## ボイスの追加方法

ボイスファイルの詳細な実装方法については、**[doc/VOICE_IMPLEMENTATION.md](../../../doc/VOICE_IMPLEMENTATION.md)** を参照してください。

### 基本的な配置方法

1. ボイスファイルを適切なディレクトリに配置します：
   - キャラクター選択時の選択中ボイス: `voice/character/select/`
   - キャラクター確定時のボイス: `voice/character/confirm/`
   - その他のボイス: `voice/` 直下または適切なサブディレクトリ

2. ファイル名は内容を表す分かりやすい名前にします：
   - 例: `select_character_01.mp3`, `confirm_character_01.mp3`

3. 複数のキャラクターがいる場合は、キャラクター別にサブディレクトリを作成することも推奨：
   ```
   voice/character/
   ├── select/
   │   ├── chara1_select.mp3
   │   └── chara2_select.mp3
   └── confirm/
       ├── chara1_confirm.mp3
       └── chara2_confirm.mp3
   ```

## 注意事項

サウンドファイルはリポジトリサイズを管理可能に保つため、.gitkeep ファイルを除き git で無視されます。
サウンドファイルはローカルに追加するか、本番環境では別途配置してください。
