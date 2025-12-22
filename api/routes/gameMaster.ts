import { Router } from 'express';
import { GameMaster } from '../models/gameMaster';
import { authenticate, requireSystemAdmin } from '../middleware/auth';

const router = Router();

// GET /api/game-masters - ゲームマスター一覧を取得（システム管理者専用）
router.get('/', authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const gameMasters = await GameMaster.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(gameMasters);
  } catch (error) {
    console.error('Error fetching game masters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/game-masters - ゲームマスターを追加（システム管理者専用）
router.post('/', authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = (req as any).user;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // 既に登録されているかチェック
    const existing = await GameMaster.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'This user is already a game master' });
      return;
    }

    const gameMaster = await GameMaster.create({
      email,
      name: name || null,
      createdBy: user.email,
    });

    res.status(201).json(gameMaster);
  } catch (error) {
    console.error('Error creating game master:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/game-masters/:id - ゲームマスターを削除（システム管理者専用）
router.delete('/:id', authenticate, requireSystemAdmin, async (req, res) => {
  try {
    const gameMaster = await GameMaster.findByPk(req.params.id);
    
    if (!gameMaster) {
      res.status(404).json({ error: 'Game master not found' });
      return;
    }

    await gameMaster.destroy();
    res.json({ success: true, message: 'Game master removed successfully' });
  } catch (error) {
    console.error('Error deleting game master:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
