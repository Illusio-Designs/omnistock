const { Router } = require('express');
const { getOrders, getOrder, createOrder, updateOrderStatus, cancelOrder } = require('../controllers/order.controller');
const {
  authenticate, requireTenant, requirePermission, enforceLimit,
} = require('../middleware/auth.middleware');
const { requestReviewForOrder, processReviewQueue, REVIEW_DELAY_HOURS } = require('../services/review.service');

const router = Router();
router.use(authenticate, requireTenant);

// ═════════════════════════════════════════════════════════════════════════════
// REVIEW REQUESTS — MUST be declared before /:id routes to avoid conflicts
// ═════════════════════════════════════════════════════════════════════════════

router.post('/process-review-queue', requirePermission('orders.update'), async (req, res) => {
  try {
    const result = await processReviewQueue({
      delayHours: req.body?.delayHours,
      limit: req.body?.limit,
      tenantId: req.tenant.id,
    });
    res.json({ defaultDelayHours: REVIEW_DELAY_HOURS, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/request-review', requirePermission('orders.update'), async (req, res) => {
  try {
    const result = await requestReviewForOrder(req.params.id, { tenantId: req.tenant.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Standard CRUD ────────────────────────────────────────────────────────────

router.get('/',              requirePermission('orders.read'),    getOrders);
router.get('/:id',           requirePermission('orders.read'),    getOrder);
router.post('/',             requirePermission('orders.create'),  enforceLimit('orders'), createOrder);
router.patch('/:id/status',  requirePermission('orders.update'),  updateOrderStatus);
router.patch('/:id/cancel',  requirePermission('orders.cancel'),  cancelOrder);

module.exports = router;
