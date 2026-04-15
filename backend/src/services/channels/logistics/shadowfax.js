const axios = require('axios');

// Shadowfax API — last-mile & hyperlocal
// Credentials: { apiKey }
// Apply at: https://shadowfax.in/business

const BASE = 'https://api.shadowfax.in/api/v3';

class ShadowfaxAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'Authorization': `Token ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/client/profile');
    return { success: true, clientName: data.name };
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      client_order_id: order.orderNumber,
      order_type: order.paymentStatus === 'PAID' ? 'PREPAID' : 'COD',
      pickup_details: {
        name: warehouseAddress.name || 'Warehouse',
        phone: warehouseAddress.phone || '',
        address: warehouseAddress.line1 || '',
        city: warehouseAddress.city || '',
        pincode: warehouseAddress.pincode || '',
      },
      drop_details: {
        name: order.customer?.name || '',
        phone: order.customer?.phone || '',
        address: order.shippingAddress?.line1 || '',
        city: order.shippingAddress?.city || '',
        pincode: order.shippingAddress?.pincode || '',
      },
      cod_amount: order.paymentStatus === 'PAID' ? 0 : parseFloat(order.total),
      declared_value: parseFloat(order.total),
      weight: 500,
    };
    const { data } = await this.client.post('/client/orders', payload);
    return { awbCode: data.awb || data.tracking_id, courierName: 'Shadowfax' };
  }

  async trackShipment(awb) {
    const { data } = await this.client.get(`/client/track/${awb}`);
    return { awbCode: awb, currentStatus: data.status, activities: data.events || [] };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.post(`/client/orders/${awb}/cancel`);
    return data;
  }
}

module.exports = ShadowfaxAdapter;
