import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Background } from '../models';

const router = Router();

// GET /api/background
router.get('/', async (req, res) => {
  try {
    const backgrounds = await Background.findAll({ where: { deleted: false }, order: [['sortOrder', 'ASC']] });
    res.json(backgrounds);
  } catch (e) {
    console.error('Error fetching backgrounds:', e);
    res.status(500).json({ error: 'Failed to fetch backgrounds' });
  }
});

// GET /api/background/:id
router.get('/:id', async (req, res) => {
  try {
    const background = await Background.findByPk(req.params.id);
    if (!background || background.deleted) return res.status(404).json({ error: 'Not found' });
    res.json(background);
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/background/:id
router.delete('/:id', async (req, res) => {
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

// PUT /api/background/:id
router.put('/:id', async (req, res) => {
  try {
    const background = await Background.findByPk(req.params.id);
    if (!background || background.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    if (name !== undefined && name !== '') {
      background.name = name;
    }

    if (offsetX !== undefined && offsetX !== '') {
      const parsedOffsetX = parseInt(offsetX);
      if (isNaN(parsedOffsetX) || parsedOffsetX < -1000 || parsedOffsetX > 1000) {
        return res.status(400).json({ error: 'Invalid offsetX value' });
      }
      background.offsetX = parsedOffsetX;
    }

    if (offsetY !== undefined && offsetY !== '') {
      const parsedOffsetY = parseInt(offsetY);
      if (isNaN(parsedOffsetY) || parsedOffsetY < -1000 || parsedOffsetY > 1000) {
        return res.status(400).json({ error: 'Invalid offsetY value' });
      }
      background.offsetY = parsedOffsetY;
    }

    if (width !== undefined && width !== '') {
      const parsedWidth = parseInt(width);
      if (isNaN(parsedWidth) || parsedWidth < 1 || parsedWidth > 2000) {
        return res.status(400).json({ error: 'Invalid width value' });
      }
      background.width = parsedWidth;
    }

    if (height !== undefined && height !== '') {
      const parsedHeight = parseInt(height);
      if (isNaN(parsedHeight) || parsedHeight < 1 || parsedHeight > 2000) {
        return res.status(400).json({ error: 'Invalid height value' });
      }
      background.height = parsedHeight;
    }

    await background.save();
    res.json(background);
  } catch (e) {
    console.error('Error updating background:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
