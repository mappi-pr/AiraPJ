import { Router } from 'express';
import { FrontHair } from '../models/frontHair';

const router = Router();

// GET /api/front-hair
router.get('/', async (req, res) => {
  const frontHairs = await FrontHair.findAll({ order: [['id', 'ASC']] });
  res.json(frontHairs);
});

export default router;
