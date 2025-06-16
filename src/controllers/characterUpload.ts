import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import Character from '../models/character';

// 保存先とファイル名の設定
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join('assets', 'img', 'chr'));
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// キャラクタ画像アップロード&DB登録API
export const uploadCharacterAsset = [
  upload.single('asset'),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const assetPath = path.join('assets', 'img', 'chr', req.file.filename);
    // DBに新規キャラクタ登録
    const character = await Character.create({
      id: req.body.id,
      name: req.body.name,
      assetPath
    });
    res.json({ success: true, character });
  }
];
