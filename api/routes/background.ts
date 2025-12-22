import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Background } from '../models';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/background
router.get('/', async (req, res) => {
  const backgrounds = await Background.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
  res.json(backgrounds);
});

// DELETE /api/background/:id (管理者専用)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const background = await Background.findByPk(req.params.id);
    if (!background || background.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = background.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    background.deleted = true;
    background.deletedAt = new Date();
    await background.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/background/:id/order
router.put('/:id/order', async (req, res) => {
  try {
    const { direction } = req.body;
    const currentItem = await Background.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allItems = await Background.findAll({ 
      where: { deleted: false }, 
      order: [['sortOrder', 'ASC']] 
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

    await currentItem.save();
    await swapItem.save();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Order update failed' });
  }
});

export default router;
