const axios = require('axios');

// Pickrr — shipping aggregator (now part of Shiprocket group)
// Credentials: { authToken }
// Apply at: https://www.pickrr.com

const BASE = 'https://api.pickrr.com/plugins';

class PickrrAdapter {
  constructor(credentials) {
    this.authToken = credentials.authToken;
    this.client = axios.create({
      baseURL: BASE,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/profile', {
      params: { auth_token: this.authToken },
    });
    return { success: true, name: data.name || data.client_name };
  }

  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod = false, orderValue = 0 }) {
    const { data } = await this.client.get('/serviceability/', {
      params: {
        auth_token: this.authToken,
        from_pincode: pickupPincode,
        to_pincode: deliveryPincode,
        weight: (weight || 0.5) * 1000,
        payment_type: cod ? 'cod' : 'pre-paid',
        order_amount: orderValue,
      },
    });
    return data.data || [];
  }

  async getRates(params) { return this.checkServiceability(params); }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      auth_token: this.authToken,
      from_name: warehouseAddress.name || 'Warehouse',
      from_phone_number: warehouseAddress.phone || '',
      from_address: warehouseAddress.line1 || '',
      from_city: warehouseAddress.city || '',
      from_state: warehouseAddress.state || '',
      from_pincode: warehouseAddress.pincode || '',
      to_name: order.customer?.name || '',
      to_phone_number: order.customer?.phone || '',
      to_address: order.shippingAddress?.line1 || '',
      to_city: order.shippingAddress?.city || '',
      to_state: order.shippingAddress?.state || '',
      to_pincode: order.shippingAddress?.pincode || '',
      item_name: order.items?.[0]?.variant?.name || 'Item',
      quantity: order.items?.length || 1,
      invoice_value: parseFloat(order.total),
      client_order_id: order.orderNumber,
      cod_amount: order.paymentStatus === 'PAID' ? 0 : parseFloat(order.total),
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10,
    };
    const { data } = await this.client.post('/order_create/', payload);
    return {
      awbCode: data.tracking_id || data.awb,
      courierName: data.courier_name || 'Pickrr',
      raw: data,
    };
  }

  async trackShipment(awb) {
    const { data } = await this.client.get('/tracking/', {
      params: { auth_token: this.authToken, tracking_id: awb },
    });
    return {
      awbCode: awb,
      currentStatus: data.status,
      courierName: data.courier_name,
      activities: data.scan_data || [],
    };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.post('/cancel/', {
      auth_token: this.authToken,
      tracking_id: Array.isArray(awb) ? awb[0] : awb,
    });
    return data;
  }

  async getPickupLocations() {
    const { data } = await this.client.get('/warehouse/', {
      params: { auth_token: this.authToken },
    });
    return data.data || [];
  }
}

module.exports = PickrrAdapter;
