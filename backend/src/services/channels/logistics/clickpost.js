const axios = require('axios');

// ClickPost — multi-carrier shipping & post-ship tracking API
// Credentials: { username, apiKey }
// Apply at: https://www.clickpost.ai

const BASE = 'https://www.clickpost.in/api/v1';

class ClickPostAdapter {
  constructor(credentials) {
    this.username = credentials.username;
    this.apiKey = credentials.apiKey;
    this.client = axios.create({
      baseURL: BASE,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  _auth(extra = {}) {
    return { username: this.username, key: this.apiKey, ...extra };
  }

  async testConnection() {
    const { data } = await this.client.get('/check-pincode-service/', {
      params: this._auth({ pincode: '110001' }),
    });
    return { success: data.meta?.status !== false, message: data.meta?.message || 'Connected' };
  }

  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod = false }) {
    const { data } = await this.client.get('/check-pincode-service/', {
      params: this._auth({
        pickup_pincode: pickupPincode,
        drop_pincode: deliveryPincode,
        weight: (weight || 0.5) * 1000,
        cod: cod ? 1 : 0,
      }),
    });
    return data.result || [];
  }

  async getRates(params) { return this.checkServiceability(params); }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      account_code: channel.credentials?.accountCode || '',
      cp_id: channel.credentials?.cpId || '',
      reference_number: order.orderNumber,
      order_type: order.paymentStatus === 'PAID' ? 'PPD' : 'COD',
      cod_value: order.paymentStatus === 'PAID' ? 0 : parseFloat(order.total),
      declared_value: parseFloat(order.total),
      recipient_name: order.customer?.name || '',
      recipient_contact: order.customer?.phone || '',
      recipient_email: order.customer?.email || '',
      recipient_address_line1: order.shippingAddress?.line1 || '',
      recipient_address_line2: order.shippingAddress?.line2 || '',
      recipient_city: order.shippingAddress?.city || '',
      recipient_state: order.shippingAddress?.state || '',
      recipient_pincode: order.shippingAddress?.pincode || '',
      pickup_name: warehouseAddress.name || 'Warehouse',
      pickup_contact: warehouseAddress.phone || '',
      pickup_address_line1: warehouseAddress.line1 || '',
      pickup_city: warehouseAddress.city || '',
      pickup_state: warehouseAddress.state || '',
      pickup_pincode: warehouseAddress.pincode || '',
      weight: 500,
      length: 10,
      breadth: 10,
      height: 10,
      item_list: (order.items || []).map(i => ({
        sku: i.variant?.sku || '',
        name: i.variant?.name || 'Item',
        qty: i.qty,
        price: parseFloat(i.unitPrice),
      })),
    };
    const { data } = await this.client.post(
      '/create-order/',
      payload,
      { params: this._auth() }
    );
    return {
      awbCode: data.result?.waybill,
      courierName: data.result?.courier_partner_name || 'ClickPost',
      raw: data,
    };
  }

  async trackShipment(awb) {
    const { data } = await this.client.get('/track-order/', {
      params: this._auth({ waybill: awb }),
    });
    return {
      awbCode: awb,
      currentStatus: data.result?.additional?.status,
      courierName: data.result?.cp_name,
      activities: data.result?.scans || [],
    };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.post(
      '/cancel-order/',
      { waybill: Array.isArray(awb) ? awb[0] : awb },
      { params: this._auth() }
    );
    return data;
  }
}

module.exports = ClickPostAdapter;
