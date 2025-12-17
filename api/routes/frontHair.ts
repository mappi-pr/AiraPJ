import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FrontHair } from '../models/frontHair';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/front-hair
router.get('/', async (req, res) => {
  const frontHairs = await FrontHair.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
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

export default router;
