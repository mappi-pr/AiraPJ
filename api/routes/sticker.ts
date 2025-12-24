import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Sticker } from '../models/sticker';

const router = Router();

// GET /api/sticker
router.get('/', async (req, res) => {
  const stickers = await Sticker.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
  res.json(stickers);
});

// DELETE /api/sticker/:id
router.delete('/:id', async (req, res) => {
  try {
    const sticker = await Sticker.findByPk(req.params.id);
    if (!sticker || sticker.deleted) return res.status(404).json({ error: 'Not found' });
    // 画像物理削除
    let filePath = sticker.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // 論理削除
    sticker.deleted = true;
    sticker.deletedAt = new Date();
    await sticker.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
