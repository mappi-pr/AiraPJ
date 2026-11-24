import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Sticker } from '../models/sticker';
import { getUploadsBasePath } from '../config/uploads';
import { imageFileFilter, singleImageUpload, MAX_UPLOAD_FILE_SIZE } from '../middleware/uploadValidation';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'sticker');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // 同一ミリ秒のアップロードでも衝突しないようランダムなサフィックスを付与する
    const suffix = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}-${suffix}${ext}`);
  },
});
const upload = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: MAX_UPLOAD_FILE_SIZE } });

// バリデーション失敗・処理失敗時に、保存済みファイルを残存させないための後始末
function removeSavedFile(file: Express.Multer.File | undefined) {
  if (file && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (fileError) {
      console.error('Failed to remove uploaded file:', fileError);
    }
  }
}

// POST /api/sticker/upload
router.post('/upload', singleImageUpload(upload, 'asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name, offsetX, offsetY, width, height } = req.body;

    if (typeof name !== 'string' || name.trim() === '') {
      removeSavedFile(req.file);
      res.status(400).json({ error: 'Invalid name value' });
      return;
    }

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
      removeSavedFile(req.file);
      res.status(400).json({ error: 'Invalid position/size values' });
      return;
    }
    const assetPath = `/uploads/sticker/${req.file.filename}`;

    // 最大のsortOrderを取得して+1（削除済みアイテムは除外）
    const maxOrderItem = await Sticker.findOne({
      where: { deleted: false },
      order: [['sortOrder', 'DESC']]
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;

    const sticker = await Sticker.create({
      name,
      assetPath,
      sortOrder,
      offsetX: parsedOffsetX,
      offsetY: parsedOffsetY,
      width: parsedWidth,
      height: parsedHeight,
    });
    res.json(sticker);
  } catch (err) {
    console.error('Sticker upload error:', err);
    removeSavedFile(req.file);
    // 内部エラー詳細はレスポンスに含めない（サーバーログにのみ出力）
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
