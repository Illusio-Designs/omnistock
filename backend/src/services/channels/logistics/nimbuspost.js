const axios = require('axios');

// NimbusPost — shipping aggregator for D2C brands
// Credentials: { email, password }
// Apply at: https://nimbuspost.com

const BASE = 'https://api.nimbuspost.com/v1';

class NimbusPostAdapter {
  constructor(credentials) {
    this.email = credentials.email;
    this.password = credentials.password;
    this._token = null;
    this._tokenExpiry = 0;
  }

  async _getToken() {
    if (this._token && this._tokenExpiry > Date.now()) return this._token;
    const { data } = await axios.post(`${BASE}/users/login`, {
      email: this.email,
      password: this.password,
    });
    this._token = data.data;
    this._tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return this._token;
  }

  async _req(method, path, payload = null, params = {}) {
    const token = await this._getToken();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params,
      data: payload,
    });
    return data;
  }

  async testConnection() {
    await this._getToken();
    return { success: true, email: this.email };
  }

  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod = false, orderValue = 0 }) {
    const data = await this._req('POST', '/courier/serviceability', {
      origin: pickupPincode,
      destination: deliveryPincode,
      payment_type: cod ? 'cod' : 'prepaid',
      order_amount: orderValue,
      weight: (weight || 0.5) * 1000,
      length: 10,
      breadth: 10,
      height: 10,
    });
    return data.data || [];
  }

  async getRates(params) { return this.checkServiceability(params); }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      order_number: order.orderNumber,
      payment_type: order.paymentStatus === 'PAID' ? 'prepaid' : 'cod',
      order_amount: parseFloat(order.total),
      package_weight: 500,
      package_length: 10,
      package_breadth: 10,
      package_height: 10,
      request_auto_pickup: 'yes',
      consignee: {
        name: order.customer?.name || '',
        address: order.shippingAddress?.line1 || '',
        address_2: order.shippingAddress?.line2 || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        pincode: order.shippingAddress?.pincode || '',
        phone: order.customer?.phone || '',
      },
      pickup: {
        warehouse_name: warehouseAddress.name || 'Primary',
        name: warehouseAddress.contactName || warehouseAddress.name || 'Warehouse',
        address: warehouseAddress.line1 || '',
        address_2: warehouseAddress.line2 || '',
        city: warehouseAddress.city || '',
        state: warehouseAddress.state || '',
        pincode: warehouseAddress.pincode || '',
        phone: warehouseAddress.phone || '',
      },
      order_items: (order.items || []).map(i => ({
        name: i.variant?.name || 'Item',
        qty: String(i.qty),
        price: String(i.unitPrice),
        sku: i.variant?.sku || '',
      })),
    };
    const data = await this._req('POST', '/shipments', payload);
    return {
      awbCode: data.data?.awb_number,
      courierName: data.data?.courier_name || 'NimbusPost',
      shipmentId: data.data?.shipment_id,
    };
  }

  async trackShipment(awb) {
    const data = await this._req('GET', `/shipments/track/${awb}`);
    return {
      awbCode: awb,
      currentStatus: data.data?.status,
      courierName: data.data?.courier_name,
      activities: data.data?.history || [],
    };
  }

  async cancelShipment(awb) {
    const data = await this._req('POST', '/shipments/cancel', {
      awb: Array.isArray(awb) ? awb : [awb],
    });
    return data;
  }

  async getPickupLocations() {
    const data = await this._req('GET', '/warehouses');
    return data.data || [];
  }
}

module.exports = NimbusPostAdapter;
