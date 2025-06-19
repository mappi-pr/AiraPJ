import { Router } from 'express';
import { Background } from '../models';

const router = Router();

// GET /api/background
router.get('/', async (req, res) => {
  const backgrounds = await Background.findAll({ order: [['id', 'ASC']] });
  res.json(backgrounds);
});

export default router;
