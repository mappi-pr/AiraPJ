import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { Costume } from '../models';
import { sequelize } from '../models/sequelize';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireAdminEnabled } from '../middleware/adminGate';

const router = Router();

// GET /api/costume
router.get('/', async (req, res) => {
  try {
    const costumes = await Costume.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    res.json(costumes);
  } catch (e) {
    console.error('Error fetching costumes:', e);
    res.status(500).json({ error: 'Failed to fetch costumes' });
  }
});

// GET /api/costume/:id
router.get('/:id', async (req, res) => {
  try {
    const costume = await Costume.findByPk(req.params.id);
    if (!costume || costume.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(costume);
  } catch (error) {
    console.error('Error fetching costume:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/costume/:id (管理者専用)
router.delete('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const costume = await Costume.findByPk(req.params.id);
    if (!costume || costume.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = costume.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    // 論理削除し、後続の未削除アイテムのsortOrderを詰める（歯抜けを残さない）
    const deletedSortOrder = costume.sortOrder;
    await sequelize.transaction(async (t) => {
      costume.deleted = true;
      costume.deletedAt = new Date();
      costume.sortOrder = 0;
      await costume.save({ transaction: t });
      if (deletedSortOrder > 0) {
        await Costume.update(
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
    console.error('Error deleting costume:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/costume/:id/order (管理者専用)
router.put('/:id/order', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const { direction } = req.body;
    const currentItem = await Costume.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allItems = await Costume.findAll({
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
    console.error('Error updating costume order:', error);
    res.status(500).json({ error: 'Order update failed' });
  }
});

// PUT /api/costume/:id (管理者専用) - 名前・位置・サイズの更新
router.put('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const costume = await Costume.findByPk(req.params.id);
    if (!costume || costume.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name value' });
      }
      costume.name = name;
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
      costume[field.key] = parsed;
    }

    await costume.save();
    res.json(costume);
  } catch (e) {
    console.error('Error updating costume:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
