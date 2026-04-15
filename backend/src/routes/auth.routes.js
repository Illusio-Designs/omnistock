const { Router } = require('express');
const { register, login, googleAuth, getMe, onboardBusiness } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/onboard', onboardBusiness);
router.get('/me', authenticate, getMe);

module.exports = router;
