import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token + impersonation tenant id to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const impersonate = localStorage.getItem('impersonate-tenant');
    if (impersonate) config.headers['x-tenant-id'] = impersonate;
  }
  return config;
});

// Handle auth + plan-limit errors globally
type PlanLimitCallback = (info: any) => void;
let onPlanLimitHit: PlanLimitCallback | null = null;
export function setPlanLimitHandler(cb: PlanLimitCallback | null) { onPlanLimitHit = cb; }

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      const status = err.response?.status;
      const url = err.config?.url || '';
      const isAuth = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/onboard') || url.includes('/auth/google');
      if (status === 401 && !isAuth) {
        localStorage.removeItem('token');
        localStorage.removeItem('kartriq-auth');
        window.location.href = '/login';
      } else if (status === 402 && onPlanLimitHit) {
        onPlanLimitHit(err.response.data || {});
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── API helpers ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  google: (credential: string) => api.post('/auth/google', { credential }),
  me: () => api.get('/auth/me'),
  onboard: (data: any) => api.post('/auth/onboard', data),
  logout: () => api.post('/auth/logout', {}),
  updateMe: (data: { name?: string; phone?: string }) => api.patch('/auth/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ── SaaS: plans (public) ───────────────────────────────────────────
export const planApi = {
  list: () => api.get('/plans'),
  get: (code: string) => api.get(`/plans/${code}`),
};

// ── SaaS: tenant-side billing ──────────────────────────────────────
export const billingApi = {
  subscription: () => api.get('/billing/subscription'),
  usage: () => api.get('/billing/usage'),
  changePlan: (data: { planCode: string; billingCycle?: string; payAsYouGo?: boolean }) =>
    api.post('/billing/subscription/change', data),
  togglePayg: (enabled: boolean) => api.post('/billing/subscription/payg', { enabled }),
  toggleAutoRenew: (enabled: boolean) => api.post('/billing/subscription/auto-renew', { enabled }),
  cancel: () => api.post('/billing/subscription/cancel', {}),
  invoices: () => api.get('/billing/invoices'),
  // Wallet
  wallet: () => api.get('/billing/wallet'),
  walletTransactions: (limit?: number) => api.get('/billing/wallet/transactions', { params: { limit } }),
  topupWallet: (amount: number, paymentRef?: string) =>
    api.post('/billing/wallet/topup', { amount, paymentRef }),
  walletSettings: (body: {
    lowBalanceThreshold?: number;
    autoTopupEnabled?: boolean;
    autoTopupAmount?: number;
    autoTopupTriggerBelow?: number;
  }) => api.patch('/billing/wallet/settings', body),
  updateTenant: (data: { businessName?: string; gstin?: string }) =>
    api.patch('/billing/tenant', data),
};

// ── OAuth (per-seller channel authorization) ──────────────────────
export const oauthApi = {
  amazonStart:  (channelId: string, region?: string) =>
    api.get('/oauth/amazon/start', { params: { channelId, ...(region ? { region } : {}) } }),
  shopifyStart: (channelId: string, shop: string) =>
    api.get('/oauth/shopify/start', { params: { channelId, shop } }),
  flipkartStart: (channelId: string) =>
    api.get('/oauth/flipkart/start', { params: { channelId } }),
  metaStart: (channelId: string) =>
    api.get('/oauth/meta/start', { params: { channelId } }),
  lazadaStart: (channelId: string, region: string) =>
    api.get('/oauth/lazada/start', { params: { channelId, region } }),
  shopeeStart: (channelId: string, region: string) =>
    api.get('/oauth/shopee/start', { params: { channelId, region } }),
  mercadoLibreStart: (channelId: string, region: string) =>
    api.get('/oauth/mercadolibre/start', { params: { channelId, region } }),
  allegroStart: (channelId: string, sandbox: boolean) =>
    api.get('/oauth/allegro/start', { params: { channelId, sandbox: String(sandbox) } }),
  wishStart: (channelId: string) =>
    api.get('/oauth/wish/start', { params: { channelId } }),
  // Generic poll endpoint — works for every provider
  status: (provider: string, channelId: string) =>
    api.get(`/oauth/${provider}/status`, { params: { channelId } }),
  amazonStatus: (channelId: string) =>
    api.get('/oauth/amazon/status', { params: { channelId } }),
};

// ── Support tickets ────────────────────────────────────────────────
export const ticketApi = {
  list: () => api.get('/tickets'),
  get: (id: string) => api.get(`/tickets/${id}`),
  create: (data: { subject: string; body: string; priority?: string; category?: string }) =>
    api.post('/tickets', data),
  reply: (id: string, body: string) => api.post(`/tickets/${id}/reply`, { body }),
  close: (id: string) => api.post(`/tickets/${id}/close`, {}),
};

// ── SaaS: tenant users ─────────────────────────────────────────────
export const userApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  permissionCatalog: () => api.get('/users/_permissions/catalog'),
};

// ── SaaS: payments (Razorpay) ──────────────────────────────────────
// Two flows:
//   1. Plan checkout: checkout(planCode) → Razorpay → verify({...resp,planCode})
//   2. Wallet top-up:  walletCheckout(amount) → Razorpay → walletVerify({...resp,amount})
// Saved methods (cards/UPI tokens) drive the autopay job once a user opts in.
export const paymentApi = {
  // Plan upgrade
  checkout: (data: { planCode: string; billingCycle?: string; savePaymentMethod?: boolean }) =>
    api.post('/payments/checkout', data),
  verify: (data: any) => api.post('/payments/verify', data),
  // Wallet top-up
  walletCheckout: (data: { amount: number; savePaymentMethod?: boolean }) =>
    api.post('/payments/wallet-checkout', data),
  walletVerify: (data: any) => api.post('/payments/wallet-verify', data),
  // Saved methods (autopay)
  methods: () => api.get('/payments/methods'),
  setDefaultMethod: (id: string) => api.post(`/payments/methods/${id}/default`, {}),
  deleteMethod: (id: string) => api.delete(`/payments/methods/${id}`),
  // Platform admin one-click test mode
  applyTestConfig: (data: { keyId: string; keySecret: string; webhookSecret?: string }) =>
    api.post('/payments/test-config', data),
};

// ── SaaS: tenant roles & RBAC ──────────────────────────────────────
export const roleApi = {
  list: () => api.get('/roles'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  assign: (userId: string, roleId: string) => api.post('/roles/assign', { userId, roleId }),
  unassign: (userId: string, roleId: string) => api.post('/roles/unassign', { userId, roleId }),
};

// ── Platform admin (SaaS founder) ──────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  // plans
  plans: () => api.get('/admin/plans'),
  createPlan: (data: any) => api.post('/admin/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  // tenants
  tenants: (params?: any) => api.get('/admin/tenants', { params }),
  tenant: (id: string) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id: string, data: any) => api.put(`/admin/tenants/${id}`, data),
  suspendTenant: (id: string) => api.post(`/admin/tenants/${id}/suspend`, {}),
  activateTenant: (id: string) => api.post(`/admin/tenants/${id}/activate`, {}),
  assignPlan: (id: string, data: any) => api.post(`/admin/tenants/${id}/assign-plan`, data),
  // subscriptions
  subscriptions: () => api.get('/admin/subscriptions'),
  // blog
  blog: () => api.get('/admin/blog'),
  createBlog: (data: any) => api.post('/admin/blog', data),
  updateBlog: (id: string, data: any) => api.put(`/admin/blog/${id}`, data),
  deleteBlog: (id: string) => api.delete(`/admin/blog/${id}`),
  // seo
  seo: () => api.get('/admin/seo'),
  upsertSeo: (data: any) => api.put('/admin/seo', data),
  deleteSeo: (id: string) => api.delete(`/admin/seo/${id}`),
  // permissions catalog
  permissions: () => api.get('/admin/permissions'),
  // public content (CMS)
  content: (type?: string) => api.get('/admin/content', { params: type ? { type } : {} }),
  createContent: (data: any) => api.post('/admin/content', data),
  updateContent: (id: string, data: any) => api.put(`/admin/content/${id}`, data),
  deleteContent: (id: string) => api.delete(`/admin/content/${id}`),
  // audit
  audit: (params?: any) => api.get('/admin/audit', { params }),
  // tickets
  tickets: (params?: any) => api.get('/admin/tickets', { params }),
  ticket: (id: string) => api.get(`/admin/tickets/${id}`),
  replyTicket: (id: string, body: string, status?: string) =>
    api.post(`/admin/tickets/${id}/reply`, { body, status }),
  setTicketStatus: (id: string, status: string) =>
    api.put(`/admin/tickets/${id}/status`, { status }),
  // platform settings
  settings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) => api.put(`/admin/settings/${encodeURIComponent(key)}`, { value }),
  updateSettings: (items: { key: string; value: string }[]) => api.put('/admin/settings', items),
  deleteSetting: (key: string) => api.delete(`/admin/settings/${encodeURIComponent(key)}`),
};

// ── Public CMS (blog, seo, sitemap, stats, content) ────────────────
export const publicApi = {
  blog: () => api.get('/public/blog'),
  blogPost: (slug: string) => api.get(`/public/blog/${slug}`),
  seo: (path: string) => api.get('/public/seo', { params: { path } }),
  sitemap: () => api.get('/public/sitemap'),
  stats: () => api.get('/public/stats'),
  integrations: () => api.get('/public/integrations'),
  content: (type: string) => api.get('/public/content', { params: { type } }),
  tracking: () => api.get('/public/tracking'),
  maintenance: () => api.get('/public/maintenance'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const productApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  addVariant: (id: string, data: any) => api.post(`/products/${id}/variants`, data),
  categories: () => api.get('/products/categories'),
  brands: () => api.get('/products/brands'),
  // Push product changes (title, price, stock, images) to every channel it's listed on
  syncChannels: (id: string, channelIds?: string[]) =>
    api.post(`/products/${id}/sync-channels`, { channelIds }),
};

export const inventoryApi = {
  list: (params?: any) => api.get('/inventory', { params }),
  lowStock: () => api.get('/inventory/low-stock'),
  movements: (params?: any) => api.get('/inventory/movements', { params }),
  adjust: (data: any) => api.post('/inventory/adjust', data),
};

export const orderApi = {
  list: (params?: any) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
  cancel: (id: string) => api.patch(`/orders/${id}/cancel`, {}),
  // Review requests — triggered N hours after delivery
  requestReview: (id: string) => api.post(`/orders/${id}/request-review`, {}),
  processReviewQueue: (body?: { delayHours?: number; limit?: number }) =>
    api.post('/orders/process-review-queue', body || {}),
  // Warehouse routing
  routingSuggestion: (id: string) => api.get(`/orders/${id}/routing`),
  assignWarehouse: (id: string, body: { warehouseId?: string; auto?: boolean }) =>
    api.patch(`/orders/${id}/warehouse`, body),
  // RTO risk scoring + approval
  scoreRto: (id: string) => api.post(`/orders/${id}/rto/score`, {}),
  approve: (id: string) => api.post(`/orders/${id}/approve`, {}),
  reject: (id: string, reason?: string) => api.post(`/orders/${id}/reject`, { reason }),
  enrich: (id: string, body: any) => api.patch(`/orders/${id}/enrich`, body),
  setFulfillment: (id: string, body: { fulfillmentType: 'SELF' | 'CHANNEL' | 'DROPSHIP'; channelFulfillmentCenter?: string }) =>
    api.patch(`/orders/${id}/fulfillment`, body),
};

export const purchaseApi = {
  list: (params?: any) => api.get('/purchases', { params }),
  get: (id: string) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  updateStatus: (id: string, status: string) => api.patch(`/purchases/${id}/status`, { status }),
};

export const vendorApi = {
  list: () => api.get('/vendors'),
  get: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
};

export const warehouseApi = {
  list: () => api.get('/warehouses'),
  get: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
};

export const shipmentApi = {
  list: (params?: any) => api.get('/shipments', { params }),
  get: (id: string) => api.get(`/shipments/${id}`),
  create: (data: any) => api.post('/shipments', data),
  updateStatus: (id: string, status: string) => api.patch(`/shipments/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/shipments/${id}`),
};

export const invoiceApi = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  pay: (id: string, data: any) => api.post(`/invoices/${id}/pay`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
};

// ─── Channels ──────────────────────────────────────────────────────────────
// Covers: CRUD, global catalog browser, integration requests, connect/test,
// order/inventory sync, listings (SKU mappings), shipping operations.
export const channelApi = {
  // Connected channels CRUD
  list: (params?: { category?: string }) => api.get('/channels', { params }),
  get: (id: string) => api.get(`/channels/${id}`),
  create: (data: { name: string; type: string; category?: string }) =>
    api.post('/channels', data),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  delete: (id: string) => api.delete(`/channels/${id}`),

  // Global catalog — all channels in the market + connection status
  catalog: (params?: { category?: string }) => api.get('/channels/catalog', { params }),
  catalogEntry: (type: string) => api.get(`/channels/catalog/${type}`),
  requestIntegration: (type: string, data?: { notes?: string; name?: string }) =>
    api.post(`/channels/catalog/${type}/request`, data || {}),

  // Integration requests (admin/user workflow)
  listRequests: (params?: { status?: string; type?: string; category?: string }) =>
    api.get('/channels/requests', { params }),
  getRequest: (id: string) => api.get(`/channels/requests/${id}`),
  updateRequest: (id: string, data: { status?: string; adminNotes?: string }) =>
    api.patch(`/channels/requests/${id}`, data),
  deleteRequest: (id: string) => api.delete(`/channels/requests/${id}`),

  // Credentials & connection
  connect: (id: string, credentials: Record<string, any>) =>
    api.post(`/channels/${id}/connect`, credentials),
  test: (id: string) => api.get(`/channels/${id}/test`),

  // Order & inventory sync
  syncOrders: (id: string, body?: { since?: string }) =>
    api.post(`/channels/${id}/sync/orders`, body || {}),
  syncInventory: (id: string) => api.post(`/channels/${id}/sync/inventory`, {}),

  // SKU mappings (ChannelListing)
  listListings: (id: string) => api.get(`/channels/${id}/listings`),
  createListing: (id: string, data: any) => api.post(`/channels/${id}/listings`, data),
  deleteListing: (id: string, sku: string) => api.delete(`/channels/${id}/listings/${sku}`),

  // Shipping channels
  shippingRates: (id: string, data: any) => api.post(`/channels/${id}/shipping/rates`, data),
  createShipment: (id: string, data: { orderId: string; warehouseId?: string }) =>
    api.post(`/channels/${id}/shipping/create`, data),
  trackShipment: (id: string, awb: string) => api.get(`/channels/${id}/shipping/track/${awb}`),
  cancelShipment: (id: string, data: { awb?: string; awbs?: string[] }) =>
    api.post(`/channels/${id}/shipping/cancel`, data),
  pickupLocations: (id: string) => api.get(`/channels/${id}/shipping/pickups`),

  // Amazon MCF (Smart Biz)
  mcfFulfill: (id: string, orderId: string) =>
    api.post(`/channels/${id}/mcf/fulfill`, { orderId }),
  mcfTrack: (id: string, orderNumber: string) => api.get(`/channels/${id}/mcf/track/${orderNumber}`),
  mcfCancel: (id: string, orderNumber: string) =>
    api.post(`/channels/${id}/mcf/cancel`, { orderNumber }),
  mcfInventory: (id: string) => api.get(`/channels/${id}/mcf/inventory`),
};

export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const reportApi = {
  sales: (params?: any) => api.get('/reports/sales', { params }),
  inventoryValuation: () => api.get('/reports/inventory-valuation'),
  topProducts: (params?: any) => api.get('/reports/top-products', { params }),
};
