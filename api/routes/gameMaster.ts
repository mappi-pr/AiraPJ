import { Router } from 'express';
import { GameMaster } from '../models/gameMaster';
import { authenticate, requireSystemAdmin, isGameMaster } from '../middleware/auth';

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
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // メールアドレスは大文字小文字を区別しないため、小文字化して登録する（Issue #148）
    const normalizedEmail = String(email).trim().toLowerCase();

    // 既に登録されているかチェック（照合も大文字小文字を区別しない）
    if (await isGameMaster(normalizedEmail)) {
      res.status(409).json({ error: 'This user is already a game master' });
      return;
    }

    const gameMaster = await GameMaster.create({
      email: normalizedEmail,
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
