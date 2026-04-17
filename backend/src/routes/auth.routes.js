const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { register, login, googleAuth, getMe, onboardBusiness } = require('../controllers/auth.controller');
const { authenticate, invalidateUserCache } = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/onboard', onboardBusiness);
router.get('/me', authenticate, getMe);

// Self-service profile update (name + phone only)
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const data = {};
    if (name != null) data.name = String(name).trim().slice(0, 191);
    if (phone != null) data.phone = String(phone).trim().slice(0, 30);
    if (!Object.keys(data).length) return res.json({ ok: true });
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Self-service password change
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.password) {
      return res.status(400).json({ error: 'No password set — sign in with Google instead' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout — invalidates the server-side permission cache immediately.
// (The JWT itself is stateless; the client should also drop its copy.)
router.post('/logout', authenticate, (req, res) => {
  invalidateUserCache(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
