import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FrontHair } from '../models/frontHair';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/front-hair
router.get('/', async (req, res) => {
  const frontHairs = await FrontHair.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
  res.json(frontHairs);
});

// DELETE /api/front-hair/:id (管理者専用)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const frontHair = await FrontHair.findByPk(req.params.id);
    if (!frontHair || frontHair.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = frontHair.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    frontHair.deleted = true;
    frontHair.deletedAt = new Date();
    await frontHair.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/front-hair/:id/order
router.put('/:id/order', async (req, res) => {
  try {
    const { direction } = req.body;
    const currentItem = await FrontHair.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allItems = await FrontHair.findAll({ 
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
