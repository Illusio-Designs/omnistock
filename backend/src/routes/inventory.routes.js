const { Router } = require('express');
const { getInventory, adjustInventory, getLowStockItems, getStockMovements } = require('../controllers/inventory.controller');
const { authenticate, requireTenant, requirePermission } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/',           requirePermission('inventory.read'),   getInventory);
router.get('/low-stock',  requirePermission('inventory.read'),   getLowStockItems);
router.get('/movements',  requirePermission('inventory.read'),   getStockMovements);
router.post('/adjust',    requirePermission('inventory.adjust'), adjustInventory);

module.exports = router;
