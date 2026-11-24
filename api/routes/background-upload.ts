import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Background } from '../models';
import { getUploadsBasePath } from '../config/uploads';
import { imageFileFilter, singleImageUpload, MAX_UPLOAD_FILE_SIZE } from '../middleware/uploadValidation';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'bg');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});
const upload = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: MAX_UPLOAD_FILE_SIZE } });

// アップロードを取り消す場合（バリデーションエラー・処理失敗時）に、保存済みファイルを削除する
const removeUploadedFile = (file: { path: string } | undefined) => {
  if (file && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

// POST /api/background/upload
router.post('/upload', singleImageUpload(upload, 'asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name, offsetX, offsetY, width, height } = req.body;

    // 位置・サイズ（任意。未指定時はデフォルト値、整数でない・範囲外はエラー）
    const parseOptionalInt = (value: unknown, defaultValue: number): number | null => {
      if (value === undefined || value === '') return defaultValue;
      const parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    };
    const parsedOffsetX = parseOptionalInt(offsetX, 0);
    const parsedOffsetY = parseOptionalInt(offsetY, 0);
    const parsedWidth = parseOptionalInt(width, 240);
    const parsedHeight = parseOptionalInt(height, 320);
    if (
      parsedOffsetX === null || parsedOffsetX < -1000 || parsedOffsetX > 1000 ||
      parsedOffsetY === null || parsedOffsetY < -1000 || parsedOffsetY > 1000 ||
      parsedWidth === null || parsedWidth < 1 || parsedWidth > 2000 ||
      parsedHeight === null || parsedHeight < 1 || parsedHeight > 2000
    ) {
      removeUploadedFile(req.file);
      res.status(400).json({ error: 'Invalid position/size values' });
      return;
    }
    const assetPath = `/uploads/bg/${req.file.filename}`;
    
    const maxOrderItem = await Background.findOne({ 
      where: { deleted: false },
      order: [['sortOrder', 'DESC']] 
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;
    
    const background = await Background.create({
      name,
      assetPath,
      sortOrder,
      offsetX: parsedOffsetX,
      offsetY: parsedOffsetY,
      width: parsedWidth,
      height: parsedHeight,
    });
    res.json(background);
  } catch (err) {
    console.error('Background upload error:', err);
    if (!res.headersSent) {
      removeUploadedFile(req.file);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
