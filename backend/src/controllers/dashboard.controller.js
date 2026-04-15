const prisma = require('../utils/prisma');

const getDashboard = async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalOrders, todayOrders, pendingOrders, processingOrders,
      monthRevenue, lastMonthRevenue,
      totalProducts, lowStockCount,
      totalCustomers,
    ] = await Promise.all([
      prisma.order.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.order.count({ where: { tenantId, status: 'PROCESSING' } }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED'] } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { notIn: ['CANCELLED'] } },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.inventoryItem.count({ where: { tenantId, quantityAvailable: { lte: 10 } } }),
      prisma.customer.count({ where: { tenantId } }),
    ]);

    const recentOrders = await prisma.order.findMany({
      where: { tenantId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, channel: true },
    });

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const revenueByDay = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: sevenDaysAgo }, status: { notIn: ['CANCELLED'] } },
      select: { createdAt: true, total: true },
    });

    // Rolling 12-month revenue for the dashboard chart
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const monthlyOrders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: twelveMonthsAgo }, status: { notIn: ['CANCELLED'] } },
      select: { createdAt: true, total: true },
    });
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = new Map();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { month: MONTH_LABELS[d.getMonth()], earnings: 0 });
    }
    for (const o of monthlyOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (b) b.earnings += Number(o.total);
    }
    const revenueByMonth = Array.from(buckets.values());

    res.json({
      summary: {
        totalOrders, todayOrders, pendingOrders, processingOrders,
        monthRevenue: monthRevenue._sum.total || 0,
        lastMonthRevenue: lastMonthRevenue._sum.total || 0,
        totalProducts, lowStockCount, totalCustomers,
      },
      recentOrders,
      ordersByStatus,
      revenueByDay,
      revenueByMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

module.exports = { getDashboard };
