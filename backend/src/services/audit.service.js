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

// ── Global auto-audit middleware ────────────────────────────────────────────
// Mount once after authenticate; it listens to every response and logs any
// mutating request (POST/PUT/PATCH/DELETE) with a derived action name. GETs
// and unauthenticated requests are skipped.
//
// Action naming: `${resource}.${verb}` where:
//   resource = first non-empty path segment after /api/v1/
//   verb     = create | update | delete | sync | connect | ... (from method+subpath)
//
// The PII-sensitive bodies (passwords, credentials) are NOT logged — only
// status code, method, path, resource id (from params.id) and metadata keys.
const SKIP_PATHS = [
  '/api/v1/auth/login',       // login failures are noisy; wire explicit audit if needed
  '/api/v1/auth/register',
  '/api/v1/auth/me',
  '/api/v1/public',
  '/api/v1/webhooks',
  '/api/v1/oauth',
];

function deriveAction(method, path) {
  // Extract first segment after /api/v1/
  const m = path.match(/^\/api\/v1\/([^/?#]+)/);
  const resource = m ? m[1] : 'unknown';
  // Detect verbs in the remainder of the path
  const rest = m ? path.slice(m[0].length) : '';
  if (/\/sync\//.test(rest) || /\/sync$/.test(rest)) return { resource, verb: 'sync' };
  if (/\/connect$/.test(rest)) return { resource, verb: 'connect' };
  if (/\/cancel$/.test(rest))  return { resource, verb: 'cancel' };
  if (/\/suspend$/.test(rest)) return { resource, verb: 'suspend' };
  if (/\/activate$/.test(rest))return { resource, verb: 'activate' };
  if (/\/pay$/.test(rest))     return { resource, verb: 'pay' };
  if (/\/reply$/.test(rest))   return { resource, verb: 'reply' };
  if (/\/close$/.test(rest))   return { resource, verb: 'close' };
  if (method === 'POST')   return { resource, verb: 'create' };
  if (method === 'PUT')    return { resource, verb: 'update' };
  if (method === 'PATCH')  return { resource, verb: 'update' };
  if (method === 'DELETE') return { resource, verb: 'delete' };
  return { resource, verb: method.toLowerCase() };
}

function autoAudit(req, res, next) {
  const method = req.method;
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return next();

  const path = req.originalUrl || req.url || '';
  if (SKIP_PATHS.some((p) => path.startsWith(p))) return next();

  res.on('finish', () => {
    // Only audit authenticated requests — no point logging 401s
    if (!req.user) return;
    // Only audit successful mutations (2xx). 4xx/5xx get logged separately if desired.
    if (res.statusCode >= 400) return;

    const { resource, verb } = deriveAction(method, path);
    audit({
      req,
      action: `${resource}.${verb}`,
      resource,
      resourceId: req.params?.id || null,
      statusCode: res.statusCode,
    });
  });
  next();
}

module.exports = { audit, auditAction, autoAudit };
