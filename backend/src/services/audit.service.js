const prisma = require('../utils/prisma');

// Fire-and-forget audit log writer. Never throws — audit failures must not
// break the originating request.
async function audit({
  req, action, resource = null, resourceId = null, metadata = null, statusCode = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId:   req?.tenant?.id || null,
        userId:     req?.user?.id || null,
        userEmail:  req?.user?.email || null,
        action,
        resource,
        resourceId,
        ip:         req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent:  req?.headers?.['user-agent'] || null,
        method:     req?.method || null,
        path:       req?.originalUrl || req?.url || null,
        statusCode,
        metadata,
      },
    });
  } catch (err) {
    // Swallow — logging should never break the request
    console.error('[audit] failed:', err.message);
  }
}

// Express middleware form — captures after-response, bound to a specific action
function auditAction(action, resource = null) {
  return (req, res, next) => {
    res.on('finish', () => {
      audit({
        req,
        action,
        resource,
        resourceId: req.params?.id || null,
        statusCode: res.statusCode,
      });
    });
    next();
  };
}

module.exports = { audit, auditAction };
