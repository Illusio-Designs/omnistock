const { Router } = require('express');
const prisma = require('../utils/prisma');

const router = Router();

// Public — pricing page
router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany({
    where: { isPublic: true, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(plans);
});

router.get('/:code', async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { code: req.params.code.toUpperCase() } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

module.exports = router;
