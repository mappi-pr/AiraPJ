import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { BackHair } from '../models/backHair';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/back-hair
router.get('/', async (req, res) => {
  try {
    const backHairs = await BackHair.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
    res.json(backHairs);
  } catch (e) {
    console.error('Error fetching back hairs:', e);
    res.status(500).json({ error: 'Failed to fetch back hairs' });
  }
});

// GET /api/back-hair/:id
router.get('/:id', async (req, res) => {
  try {
    const backHair = await BackHair.findByPk(req.params.id);
    if (!backHair || backHair.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(backHair);
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/back-hair/:id (管理者専用)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const backHair = await BackHair.findByPk(req.params.id);
    if (!backHair || backHair.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = backHair.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    backHair.deleted = true;
    backHair.deletedAt = new Date();
    await backHair.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/back-hair/:id/order (管理者専用)
router.put('/:id/order', authenticate, requireAdmin, async (req, res) => {
  try {
    const { direction } = req.body;
    const currentItem = await BackHair.findByPk(req.params.id);
    if (!currentItem || currentItem.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allItems = await BackHair.findAll({ 
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
