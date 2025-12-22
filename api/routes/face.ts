import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Face } from '../models/face';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/face
router.get('/', async (req, res) => {
  const faces = await Face.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
  res.json(faces);
});

// DELETE /api/face/:id (管理者専用)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const face = await Face.findByPk(req.params.id);
    if (!face || face.deleted) return res.status(404).json({ error: 'Not found' });
    // 画像物理削除
    let filePath = face.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // 論理削除
    face.deleted = true;
    face.deletedAt = new Date();
    await face.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/face/:id/order (管理者専用)
router.put('/:id/order', authenticate, requireAdmin, async (req, res) => {
  try {
    const { direction } = req.body; // 'up' or 'down'
    const currentItem = await Face.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 同じグループ内のアイテムを取得
    const allItems = await Face.findAll({ 
      where: { deleted: false }, 
      order: [['sortOrder', 'ASC']] 
    });

    const currentIndex = allItems.findIndex(item => item.id === currentItem.id);
    if (currentIndex === -1) return res.status(404).json({ error: 'Not found' });

    // 交換対象を決定
    let swapIndex = -1;
    if (direction === 'up' && currentIndex > 0) {
      swapIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < allItems.length - 1) {
      swapIndex = currentIndex + 1;
    }

    if (swapIndex === -1) {
      return res.json({ success: true, message: 'Already at edge' });
    }

    // sortOrderを交換
    const swapItem = allItems[swapIndex];
    const tempOrder = currentItem.sortOrder;
    currentItem.sortOrder = swapItem.sortOrder;
    swapItem.sortOrder = tempOrder;

    await currentItem.save();
    await swapItem.save();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Order update failed' });
  }
});

export default router;
