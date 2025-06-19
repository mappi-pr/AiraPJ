import { Router } from 'express';
import { Character } from '../models';

const router = Router();

// GET /api/character
router.get('/', async (req, res) => {
  const characters = await Character.findAll({ order: [['id', 'ASC']] });
  res.json(characters);
});

export default router;
