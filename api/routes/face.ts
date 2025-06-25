import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Face } from '../models/face';

const router = Router();

// GET /api/face
router.get('/', async (req, res) => {
  const faces = await Face.findAll({ where: { deleted: false }, order: [['id', 'ASC']] });
  res.json(faces);
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

export default router;
