import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { BackHair } from '../models/backHair';

const router = Router();

// GET /api/back-hair
router.get('/', async (req, res) => {
  try {
    const backHairs = await BackHair.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
    res.json(backHairs);
  } catch (e) {
    console.error('Error fetching back hair:', e);
    res.status(500).json({ error: 'Failed to fetch back hair' });
  }
});

// DELETE /api/back-hair/:id
router.delete('/:id', async (req, res) => {
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

// PUT /api/back-hair/:id/order
router.put('/:id/order', async (req, res) => {
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

// PUT /api/back-hair/:id
router.put('/:id', async (req, res) => {
  try {
    const backHair = await BackHair.findByPk(req.params.id);
    if (!backHair || backHair.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined && name !== '') {
      backHair.name = name;
    }

    if (offsetX !== undefined && offsetX !== '') {
      const parsedOffsetX = parseInt(offsetX);
      if (isNaN(parsedOffsetX) || parsedOffsetX < -1000 || parsedOffsetX > 1000) {
        return res.status(400).json({ error: 'Invalid offsetX value' });
      }
      backHair.offsetX = parsedOffsetX;
    }

    if (offsetY !== undefined && offsetY !== '') {
      const parsedOffsetY = parseInt(offsetY);
      if (isNaN(parsedOffsetY) || parsedOffsetY < -1000 || parsedOffsetY > 1000) {
        return res.status(400).json({ error: 'Invalid offsetY value' });
      }
      backHair.offsetY = parsedOffsetY;
    }

    if (width !== undefined && width !== '') {
      const parsedWidth = parseInt(width);
      if (isNaN(parsedWidth) || parsedWidth < 1 || parsedWidth > 2000) {
        return res.status(400).json({ error: 'Invalid width value' });
      }
      backHair.width = parsedWidth;
    }

    if (height !== undefined && height !== '') {
      const parsedHeight = parseInt(height);
      if (isNaN(parsedHeight) || parsedHeight < 1 || parsedHeight > 2000) {
        return res.status(400).json({ error: 'Invalid height value' });
      }
      backHair.height = parsedHeight;
    }

    await backHair.save();
    res.json(backHair);
  } catch (e) {
    console.error('Error updating back hair:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
