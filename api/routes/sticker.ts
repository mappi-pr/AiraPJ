import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { Sticker } from '../models/sticker';
import { sequelize } from '../models/sequelize';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireAdminEnabled } from '../middleware/adminGate';

const router = Router();

// GET /api/sticker
router.get('/', async (req, res) => {
  try {
    const stickers = await Sticker.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    res.json(stickers);
  } catch (e) {
    console.error('Error fetching stickers:', e);
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
});

// GET /api/sticker/:id
router.get('/:id', async (req, res) => {
  try {
    const sticker = await Sticker.findByPk(req.params.id);
    if (!sticker || sticker.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(sticker);
  } catch (error) {
    console.error('Error fetching sticker:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/sticker/:id (管理者専用)
router.delete('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const sticker = await Sticker.findByPk(req.params.id);
    if (!sticker || sticker.deleted) return res.status(404).json({ error: 'Not found' });
    // 物理ファイルの削除はトランザクションのコミット後に行う（ここではパス解決のみ）
    let filePath = sticker.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    // 論理削除し、後続の未削除アイテムのsortOrderを詰める（歯抜けを残さない）
    const deletedSortOrder = sticker.sortOrder;
    await sequelize.transaction(async (t) => {
      sticker.deleted = true;
      sticker.deletedAt = new Date();
      sticker.sortOrder = 0;
      await sticker.save({ transaction: t });
      if (deletedSortOrder > 0) {
        await Sticker.update(
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
    console.error('Error deleting sticker:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/sticker/:id/order (管理者専用)
router.put('/:id/order', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const { direction } = req.body; // 'up' or 'down'
    const currentItem = await Sticker.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 同じグループ内のアイテムを取得
    const allItems = await Sticker.findAll({
      where: { deleted: false },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
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

    await sequelize.transaction(async (t) => {
      await currentItem.save({ transaction: t });
      await swapItem.save({ transaction: t });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating sticker order:', error);
    res.status(500).json({ error: 'Order update failed' });
  }
});

// PUT /api/sticker/:id (管理者専用) - 名前・位置・サイズの更新
router.put('/:id', requireAdminEnabled, authenticate, requireAdmin, async (req, res) => {
  try {
    const sticker = await Sticker.findByPk(req.params.id);
    if (!sticker || sticker.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name value' });
      }
      sticker.name = name;
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
      sticker[field.key] = parsed;
    }

    await sticker.save();
    res.json(sticker);
  } catch (e) {
    console.error('Error updating sticker:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
