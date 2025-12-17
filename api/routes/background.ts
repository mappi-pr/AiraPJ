import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Background } from '../models';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/background
router.get('/', async (req, res) => {
  const backgrounds = await Background.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
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

export default router;
