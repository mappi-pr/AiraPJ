import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { FrontHair } from '../models/frontHair';
import { sequelize } from '../models/sequelize';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireAdminEnabled } from '../middleware/adminGate';

const router = Router();

// GET /api/front-hair
router.get('/', async (req, res) => {
  try {
    const frontHairs = await FrontHair.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    res.json(frontHairs);
  } catch (e) {
    console.error('Error fetching front hairs:', e);
    res.status(500).json({ error: 'Failed to fetch front hairs' });
  }
});

// GET /api/front-hair/:id
router.get('/:id', async (req, res) => {
  try {
    const frontHair = await FrontHair.findByPk(req.params.id);
    if (!frontHair || frontHair.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(frontHair);
  } catch (error) {
    console.error('Error fetching front hair:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/front-hair/:id (管理者専用)
router.delete('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const frontHair = await FrontHair.findByPk(req.params.id);
    if (!frontHair || frontHair.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = frontHair.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    // 論理削除し、後続の未削除アイテムのsortOrderを詰める（歯抜けを残さない）
    const deletedSortOrder = frontHair.sortOrder;
    await sequelize.transaction(async (t) => {
      frontHair.deleted = true;
      frontHair.deletedAt = new Date();
      frontHair.sortOrder = 0;
      await frontHair.save({ transaction: t });
      if (deletedSortOrder > 0) {
        await FrontHair.update(
          { sortOrder: sequelize.literal('"sortOrder" - 1') },
          {
            where: { deleted: false, sortOrder: { [Op.gt]: deletedSortOrder } },
            transaction: t,
          }
        );
      }
    });
    // 物理ファイルの削除はトランザクションのコミット後に行う。
    // 失敗しても論理削除は成立しているため、ログに留めてレスポンスは成功とする
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Failed to delete asset file:', fileError);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting front hair:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/front-hair/:id/order
router.put('/:id/order', requireAdminEnabled, async (req, res) => {
  try {
    const { direction } = req.body;
    const currentItem = await FrontHair.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allItems = await FrontHair.findAll({
      where: { deleted: false },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });

    const currentIndex = allItems.findIndex(item => item.id === currentItem.id);
    if (currentIndex === -1) return res.status(404).json({ error: 'Not found' });

    let swapIndex = -1;
    if (direction === 'up' && currentIndex > 0) {
      swapIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < allItems.length - 1) {
      swapIndex = currentIndex + 1;
    }

    if (swapIndex === -1) {
      return res.json({ success: true, message: 'Already at edge' });
    }

    const swapItem = allItems[swapIndex];
    const tempOrder = currentItem.sortOrder;
    currentItem.sortOrder = swapItem.sortOrder;
    swapItem.sortOrder = tempOrder;

    await sequelize.transaction(async (t) => {
      await currentItem.save({ transaction: t });
      await swapItem.save({ transaction: t });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating front hair order:', error);
    res.status(500).json({ error: 'Order update failed' });
  }
});

// PUT /api/front-hair/:id (管理者専用) - 名前・位置・サイズの更新
router.put('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const frontHair = await FrontHair.findByPk(req.params.id);
    if (!frontHair || frontHair.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name value' });
      }
      frontHair.name = name;
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
      frontHair[field.key] = parsed;
    }

    await frontHair.save();
    res.json(frontHair);
  } catch (e) {
    console.error('Error updating front hair:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
