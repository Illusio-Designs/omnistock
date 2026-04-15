const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const { authenticate, requireTenant } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate, requireTenant);
router.get('/', getDashboard);

module.exports = router;
