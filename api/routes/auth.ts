import { Router } from 'express';
import { verifyGoogleToken, isAdmin } from '../middleware/auth';

const router = Router();

// POST /api/auth/verify - Google IDトークンを検証してユーザー情報を返す
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // ユーザー情報と管理者フラグを返す
    res.json({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      isAdmin: isAdmin(payload.email),
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
