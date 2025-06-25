import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { BackHair } from '../models/backHair';

const router = Router();

// GET /api/back-hair
router.get('/', async (req, res) => {
  const backHairs = await BackHair.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
  res.json(backHairs);
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

export default router;
