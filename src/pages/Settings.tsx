import React, { useRef, useState } from 'react';
import axios from 'axios';

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = assetTypeRef.current?.value;
    const name = assetNameRef.current?.value;
    const file = assetFileRef.current?.files?.[0];
    if (!file || file.type !== 'image/png') {
      setResult('PNG画像のみアップロード可能です。');
      return;
    }
    const formData = new FormData();
    formData.append('name', name || '');
    formData.append('asset', file);
    let url = '';
    if (type === 'character') url = '/api/character/upload';
    if (type === 'background') url = '/api/background/upload';
    if (type === 'costume') url = '/api/costume/upload';
    try {
      const res = await axios.post(url, formData);
      const data = res.data;
      // successプロパティがなくてもid等があれば成功扱いにする
      if (data && (data.id || data.character || data.background || data.costume)) {
        const assetPath = data.assetPath || data.character?.assetPath || data.background?.assetPath || data.costume?.assetPath;
        const imageUrl = assetPath?.startsWith('http') ? assetPath : API_BASE_URL + assetPath;
        setResult(
          `アップロード成功！\nID: ${data.id || data.character?.id || data.background?.id || data.costume?.id}\n画像: ` +
            `<img src="${imageUrl}" width="100" />`
        );
      } else {
        setResult(data.error || 'アップロード失敗');
      }
    } catch {
      setResult('アップロード失敗');
    }
  };

  return (
    <div className="main-container">
      <h1>設定</h1>
      <nav>
        <a href="/title">タイトルへ戻る</a>
      </nav>
      <h2>画像アセットアップロード</h2>
      <form id="uploadForm" onSubmit={handleUpload} encType="multipart/form-data">
        <label>
          アップロード種別:
          <select name="type" ref={assetTypeRef}>
            <option value="character">キャラクター</option>
            <option value="background">背景</option>
            <option value="costume">衣装</option>
          </select>
        </label>
        <br />
        <label>
          名前: <input type="text" name="name" ref={assetNameRef} required />
        </label>
        <br />
        <input type="file" name="asset" ref={assetFileRef} accept="image/png" required />
        <br />
        <button type="submit">アップロード</button>
      </form>
      <div id="uploadResult" dangerouslySetInnerHTML={{ __html: result }} />
    </div>
  );
};

export default Settings;
