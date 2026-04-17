const { Router } = require('express');
const { register, login, googleAuth, getMe, onboardBusiness } = require('../controllers/auth.controller');
const { authenticate, invalidateUserCache } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/onboard', onboardBusiness);
router.get('/me', authenticate, getMe);

// Logout — invalidates the server-side permission cache immediately.
// (The JWT itself is stateless; the client should also drop its copy.)
router.post('/logout', authenticate, (req, res) => {
  invalidateUserCache(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
