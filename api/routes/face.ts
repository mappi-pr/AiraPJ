import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { Face } from '../models/face';
import { sequelize } from '../models/sequelize';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/face
router.get('/', async (req, res) => {
  try {
    const faces = await Face.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
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
    // 論理削除し、後続の未削除アイテムのsortOrderを詰める（歯抜けを残さない）
    const deletedSortOrder = face.sortOrder;
    await sequelize.transaction(async (t) => {
      face.deleted = true;
      face.deletedAt = new Date();
      face.sortOrder = 0;
      await face.save({ transaction: t });
      if (deletedSortOrder > 0) {
        await Face.update(
          { sortOrder: sequelize.literal('"sortOrder" - 1') },
          {
            where: { deleted: false, sortOrder: { [Op.gt]: deletedSortOrder } },
            transaction: t,
          }
        );
      }
    });
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
    console.error('Error updating face order:', error);
    res.status(500).json({ error: 'Order update failed' });
  }
});

export default router;
