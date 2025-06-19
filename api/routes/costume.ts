import { Router } from 'express';
import { Costume } from '../models';

const router = Router();

// GET /api/costume
router.get('/', async (req, res) => {
  const costumes = await Costume.findAll({ order: [['id', 'ASC']] });
  res.json(costumes);
});

export default router;
