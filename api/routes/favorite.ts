import { Router } from 'express';
import Favorite from '../models/favorite';

const router = Router();

// GET /api/favorite?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const favorites = await Favorite.findAll({ where: { userId } });
    res.json(favorites);
  } catch (e) {
    console.error('Error fetching favorites:', e);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorite
router.post('/', async (req, res) => {
  try {
    const { userId, costumeId } = req.body;
    if (!userId || !costumeId) return res.status(400).json({ error: 'userId and costumeId required' });
    const fav = await Favorite.create({ userId, costumeId });
    res.json(fav);
  } catch (e) {
    console.error('Error creating favorite:', e);
    res.status(500).json({ error: 'Failed to create favorite' });
  }
});

// DELETE /api/favorite/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Favorite.destroy({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting favorite:', e);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

export default router;
