import { Router } from 'express';
import { Face } from '../models/face';

const router = Router();

// GET /api/face
router.get('/', async (req, res) => {
  const faces = await Face.findAll({ order: [['id', 'ASC']] });
  res.json(faces);
});

export default router;
