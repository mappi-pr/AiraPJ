import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Face } from '../models/face';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/face
router.get('/', async (req, res) => {
  try {
    const faces = await Face.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
    res.json(faces);
  } catch (e) {
    console.error('Error fetching faces:', e);
    res.status(500).json({ error: 'Failed to fetch faces' });
  }
});

// GET /api/face/:id
router.get('/:id', async (req, res) => {
  try {
    const face = await Face.findByPk(req.params.id);
    if (!face || face.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(face);
  } catch (error) {
    console.error('Error fetching face:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
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
  } catch (error) {
    console.error('Error deleting face:', error);
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
  } catch (error) {
    console.error('Error updating face order:', error);
    res.status(500).json({ error: 'Order update failed' });
  }
});

// PUT /api/face/:id (管理者専用) - 名前・位置・サイズの更新
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const face = await Face.findByPk(req.params.id);
    if (!face || face.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name value' });
      }
      face.name = name;
    }

    // 数値フィールドは未指定なら変更しない。指定時は整数かつ範囲内のみ許可する
    const numericFields: { key: 'offsetX' | 'offsetY' | 'width' | 'height'; value: unknown; min: number; max: number }[] = [
      { key: 'offsetX', value: offsetX, min: -1000, max: 1000 },
      { key: 'offsetY', value: offsetY, min: -1000, max: 1000 },
      { key: 'width', value: width, min: 1, max: 2000 },
      { key: 'height', value: height, min: 1, max: 2000 },
    ];
    for (const field of numericFields) {
      if (field.value === undefined || field.value === '') continue;
      if (typeof field.value !== 'number' && typeof field.value !== 'string') {
        return res.status(400).json({ error: `Invalid ${field.key} value` });
      }
      const parsed = Number(field.value);
      if (!Number.isInteger(parsed)) {
        return res.status(400).json({ error: `Invalid ${field.key} value` });
      }
      if (parsed < field.min || parsed > field.max) {
        return res.status(400).json({ error: `${field.key} must be between ${field.min} and ${field.max}` });
      }
      face[field.key] = parsed;
    }

    await face.save();
    res.json(face);
  } catch (e) {
    console.error('Error updating face:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
