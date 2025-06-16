import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import Costume from '../models/costume';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join('assets', 'img', 'csm'));
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export const uploadCostumeAsset = [
  upload.single('asset'),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const assetPath = path.join('assets', 'img', 'csm', req.file.filename);
    // DBに新規衣装登録（IDは自動採番）
    const costume = await Costume.create({
      name: req.body.name,
      assetPath
    });
    res.json({ success: true, costume });
  }
];
