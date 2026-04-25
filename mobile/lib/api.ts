import axios from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { tokenCache, tokenStorage } from './storage';

const baseURL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'https://api.finvera.solutions/api/v1';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenCache.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const impersonate = tokenCache.getImpersonation();
  if (impersonate) config.headers['x-tenant-id'] = impersonate;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url = err.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/google') || url.includes('/auth/onboard');
    if (err.response?.status === 401 && !isAuthRoute && tokenCache.get()) {
      tokenCache.set(null);
      await tokenStorage.remove('token');
      router.replace('/login');
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

export const planApi = {
  list: () => api.get('/plans'),
  get: (code: string) => api.get(`/plans/${code}`),
};

export const billingApi = {
  subscription: () => api.get('/billing/subscription'),
  usage: () => api.get('/billing/usage'),
  changePlan: (data: { planCode: string; billingCycle?: string; payAsYouGo?: boolean }) =>
    api.post('/billing/subscription/change', data),
  togglePayg: (enabled: boolean) => api.post('/billing/subscription/payg', { enabled }),
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

export const userApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  permissionCatalog: () => api.get('/users/_permissions/catalog'),
};

export const roleApi = {
  list: () => api.get('/roles'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  assign: (userId: string, roleId: string) => api.post('/roles/assign', { userId, roleId }),
  unassign: (userId: string, roleId: string) => api.post('/roles/unassign', { userId, roleId }),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  plans: () => api.get('/admin/plans'),
  createPlan: (data: any) => api.post('/admin/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  tenants: (params?: any) => api.get('/admin/tenants', { params }),
  tenant: (id: string) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id: string, data: any) => api.put(`/admin/tenants/${id}`, data),
  suspendTenant: (id: string) => api.post(`/admin/tenants/${id}/suspend`, {}),
  activateTenant: (id: string) => api.post(`/admin/tenants/${id}/activate`, {}),
  assignPlan: (id: string, data: any) => api.post(`/admin/tenants/${id}/assign-plan`, data),
  subscriptions: () => api.get('/admin/subscriptions'),
  permissions: () => api.get('/admin/permissions'),
  settings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) =>
    api.put(`/admin/settings/${encodeURIComponent(key)}`, { value }),
  updateSettings: (items: { key: string; value: string }[]) => api.put('/admin/settings', items),
  deleteSetting: (key: string) => api.delete(`/admin/settings/${encodeURIComponent(key)}`),
};

export const dashboardApi = { get: () => api.get('/dashboard') };

export const productApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  addVariant: (id: string, data: any) => api.post(`/products/${id}/variants`, data),
  categories: () => api.get('/products/categories'),
  brands: () => api.get('/products/brands'),
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
  requestReview: (id: string) => api.post(`/orders/${id}/request-review`, {}),
  routingSuggestion: (id: string) => api.get(`/orders/${id}/routing`),
  assignWarehouse: (id: string, body: { warehouseId?: string; auto?: boolean }) =>
    api.patch(`/orders/${id}/warehouse`, body),
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
  updateStatus: (id: string, status: string) =>
    api.patch(`/purchases/${id}/status`, { status }),
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

export const channelApi = {
  list: (params?: { category?: string }) => api.get('/channels', { params }),
  get: (id: string) => api.get(`/channels/${id}`),
  create: (data: { name: string; type: string; category?: string }) =>
    api.post('/channels', data),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  delete: (id: string) => api.delete(`/channels/${id}`),
  catalog: (params?: { category?: string }) => api.get('/channels/catalog', { params }),
  catalogEntry: (type: string) => api.get(`/channels/catalog/${type}`),
  requestIntegration: (type: string, data?: { notes?: string; name?: string }) =>
    api.post(`/channels/catalog/${type}/request`, data || {}),
  listRequests: (params?: { status?: string; type?: string; category?: string }) =>
    api.get('/channels/requests', { params }),
  connect: (id: string, credentials: Record<string, any>) =>
    api.post(`/channels/${id}/connect`, credentials),
  test: (id: string) => api.get(`/channels/${id}/test`),
  syncOrders: (id: string, body?: { since?: string }) =>
    api.post(`/channels/${id}/sync/orders`, body || {}),
  syncInventory: (id: string) => api.post(`/channels/${id}/sync/inventory`, {}),
  listListings: (id: string) => api.get(`/channels/${id}/listings`),
  createListing: (id: string, data: any) => api.post(`/channels/${id}/listings`, data),
  shippingRates: (id: string, data: any) => api.post(`/channels/${id}/shipping/rates`, data),
  createShipment: (id: string, data: { orderId: string; warehouseId?: string }) =>
    api.post(`/channels/${id}/shipping/create`, data),
  trackShipment: (id: string, awb: string) => api.get(`/channels/${id}/shipping/track/${awb}`),
  cancelShipment: (id: string, data: { awb?: string; awbs?: string[] }) =>
    api.post(`/channels/${id}/shipping/cancel`, data),
};

export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const invoiceApi = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  pay: (id: string, data: { amount?: number; method?: string; reference?: string }) =>
    api.post(`/invoices/${id}/pay`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
};

export const shipmentApi = {
  list: (params?: any) => api.get('/shipments', { params }),
  get: (id: string) => api.get(`/shipments/${id}`),
  create: (data: any) => api.post('/shipments', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/shipments/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/shipments/${id}`),
};

export const reportApi = {
  sales: (params?: any) => api.get('/reports/sales', { params }),
  inventoryValuation: () => api.get('/reports/inventory-valuation'),
  topProducts: (params?: any) => api.get('/reports/top-products', { params }),
};
