import { Router } from 'express';
import { BackHair } from '../models/backHair';

const router = Router();

// GET /api/back-hair
router.get('/', async (req, res) => {
  const backHairs = await BackHair.findAll({ order: [['id', 'ASC']] });
  res.json(backHairs);
});

export default router;
