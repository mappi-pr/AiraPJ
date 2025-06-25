import React, { useRef, useState } from 'react';
import axios from 'axios';
import texts from '../locales/ja.json';

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // アップロード種別ごとのエンドポイント
  const uploadUrls: Record<string, string> = {
    face: '/api/face/upload',
    frontHair: '/api/front-hair/upload',
    backHair: '/api/back-hair/upload',
    background: '/api/background/upload',
    costume: '/api/costume/upload',
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = assetTypeRef.current?.value;
    const name = assetNameRef.current?.value;
    const file = assetFileRef.current?.files?.[0];
    if (!file || file.type !== 'image/png') {
      setResult('PNG画像のみアップロード可能です。');
      return;
    }
    if (!type || !uploadUrls[type]) {
      setResult('種別を選択してください。');
      return;
    }
    const formData = new FormData();
    formData.append('name', name || '');
    formData.append('asset', file);
    const url = uploadUrls[type];
    try {
      const res = await axios.post(url, formData);
      const data = res.data;
      // パーツ・背景・衣装いずれかのレスポンスに対応
      const assetPath = data.assetPath || data.face?.assetPath || data.frontHair?.assetPath || data.backHair?.assetPath || data.background?.assetPath || data.costume?.assetPath;
      const id = data.id || data.face?.id || data.frontHair?.id || data.backHair?.id || data.background?.id || data.costume?.id;
      if (assetPath && id) {
        const imageUrl = assetPath.startsWith('http') ? assetPath : API_BASE_URL + assetPath;
        setResult(
          `アップロード成功！\nID: ${id}\n画像: <img src="${imageUrl}" width="100" />`
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
      <h1>{texts.settings.title}</h1>
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
      <h2>{texts.settings.uploadTitle}</h2>
      <form id="uploadForm" onSubmit={handleUpload} encType="multipart/form-data">
        <label>
          {texts.settings.typeLabel}
          <select name="type" ref={assetTypeRef}>
            <option value="face">顔パーツ</option>
            <option value="frontHair">前髪パーツ</option>
            <option value="backHair">後髪パーツ</option>
            <option value="background">背景</option>
            <option value="costume">衣装</option>
          </select>
        </label>
        <br />
        <label>
          {texts.settings.nameLabel} <input type="text" name="name" ref={assetNameRef} required />
        </label>
        <br />
        <input type="file" name="asset" ref={assetFileRef} accept="image/png" required />
        <br />
        <button type="submit">{texts.settings.uploadBtn}</button>
      </form>
      <div id="uploadResult" dangerouslySetInnerHTML={{ __html: result }} />
    </div>
  );
};

export default Settings;
