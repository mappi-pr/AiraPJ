import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Costume } from '../models';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/costume
router.get('/', async (req, res) => {
  const costumes = await Costume.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
  res.json(costumes);
});

// DELETE /api/costume/:id (管理者専用)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const costume = await Costume.findByPk(req.params.id);
    if (!costume || costume.deleted) return res.status(404).json({ error: 'Not found' });
    let filePath = costume.assetPath;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    }
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    costume.deleted = true;
    costume.deletedAt = new Date();
    await costume.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
