import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import Background from '../models/background';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join('assets', 'img', 'bg'));
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export const uploadBackgroundAsset = [
  upload.single('asset'),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const assetPath = path.join('assets', 'img', 'bg', req.file.filename);
    // DBに新規背景登録（IDは自動採番）
    const background = await Background.create({
      name: req.body.name,
      assetPath
    });
    res.json({ success: true, background });
  }
];
