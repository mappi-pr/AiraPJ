import { Router } from 'express';
import Favorite from '../models/favorite';

const router = Router();

// GET /api/favorite?userId=xxx
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const favorites = await Favorite.findAll({ where: { userId } });
  res.json(favorites);
});

// POST /api/favorite
router.post('/', async (req, res) => {
  const { userId, costumeId } = req.body;
  if (!userId || !costumeId) return res.status(400).json({ error: 'userId and costumeId required' });
  const fav = await Favorite.create({ userId, costumeId });
  res.json(fav);
});

// DELETE /api/favorite/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await Favorite.destroy({ where: { id } });
  res.json({ success: true });
});

export default router;
