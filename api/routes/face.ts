import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Face } from '../models/face';

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

// DELETE /api/face/:id
router.delete('/:id', async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// PUT /api/face/:id/order
router.put('/:id/order', async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: 'Order update failed' });
  }
});

// PUT /api/face/:id
router.put('/:id', async (req, res) => {
  try {
    const face = await Face.findByPk(req.params.id);
    if (!face || face.deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, offsetX, offsetY, width, height } = req.body;

    // Update name if provided
    if (name !== undefined && name !== '') {
      face.name = name;
    }

    // Parse and validate numeric parameters (handle '0' as valid value)
    if (offsetX !== undefined && offsetX !== '') {
      const parsedOffsetX = parseInt(offsetX);
      if (isNaN(parsedOffsetX)) {
        return res.status(400).json({ error: 'Invalid offsetX value' });
      }
      if (parsedOffsetX < -1000 || parsedOffsetX > 1000) {
        return res.status(400).json({ error: 'offsetX must be between -1000 and 1000' });
      }
      face.offsetX = parsedOffsetX;
    }

    if (offsetY !== undefined && offsetY !== '') {
      const parsedOffsetY = parseInt(offsetY);
      if (isNaN(parsedOffsetY)) {
        return res.status(400).json({ error: 'Invalid offsetY value' });
      }
      if (parsedOffsetY < -1000 || parsedOffsetY > 1000) {
        return res.status(400).json({ error: 'offsetY must be between -1000 and 1000' });
      }
      face.offsetY = parsedOffsetY;
    }

    if (width !== undefined && width !== '') {
      const parsedWidth = parseInt(width);
      if (isNaN(parsedWidth)) {
        return res.status(400).json({ error: 'Invalid width value' });
      }
      if (parsedWidth < 1 || parsedWidth > 2000) {
        return res.status(400).json({ error: 'width must be between 1 and 2000' });
      }
      face.width = parsedWidth;
    }

    if (height !== undefined && height !== '') {
      const parsedHeight = parseInt(height);
      if (isNaN(parsedHeight)) {
        return res.status(400).json({ error: 'Invalid height value' });
      }
      if (parsedHeight < 1 || parsedHeight > 2000) {
        return res.status(400).json({ error: 'height must be between 1 and 2000' });
      }
      face.height = parsedHeight;
    }

    await face.save();
    res.json(face);
  } catch (e) {
    console.error('Error updating face:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
