const axios = require('axios');

// Shipway — shipping + post-ship tracking aggregator
// Credentials: { username, licenseKey }
// Apply at: https://shipway.com

const BASE = 'https://app.shipway.com/api';

class ShipwayAdapter {
  constructor(credentials) {
    this.username = credentials.username;
    this.licenseKey = credentials.licenseKey;
    this.client = axios.create({
      baseURL: BASE,
      auth: { username: credentials.username, password: credentials.licenseKey },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/getcouriers');
    return { success: true, availableCouriers: (data.message || []).length };
  }

  async checkServiceability({ pickupPincode, deliveryPincode, weight }) {
    const { data } = await this.client.get('/getserviceability', {
      params: {
        from_pincode: pickupPincode,
        to_pincode: deliveryPincode,
        weight: (weight || 0.5) * 1000,
      },
    });
    return data.message || [];
  }

  async getRates(params) { return this.checkServiceability(params); }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      carrier_id: channel.credentials?.carrierId || '',
      order_id: order.orderNumber,
      first_name: order.customer?.name?.split(' ')[0] || '',
      last_name: order.customer?.name?.split(' ').slice(1).join(' ') || '',
      email: order.customer?.email || '',
      phone: order.customer?.phone || '',
      products: (order.items || []).map(i => ({
        product: i.variant?.name || 'Item',
        price: String(i.unitPrice),
        product_code: i.variant?.sku || '',
        product_quantity: String(i.qty),
        discount: String(i.discount || 0),
        tax_rate: '0',
        product_tax: String(i.tax || 0),
      })),
      discount: String(order.discount || 0),
      order_total: String(order.total),
      gift_card_amt: '0',
      taxes: String(order.tax || 0),
      payment_type: order.paymentStatus === 'PAID' ? 'P' : 'C',
      order_date: new Date(order.orderedAt).toISOString(),
      shipping_firstname: order.customer?.name?.split(' ')[0] || '',
      shipping_lastname: order.customer?.name?.split(' ').slice(1).join(' ') || '',
      shipping_address_1: order.shippingAddress?.line1 || '',
      shipping_address_2: order.shippingAddress?.line2 || '',
      shipping_city: order.shippingAddress?.city || '',
      shipping_state: order.shippingAddress?.state || '',
      shipping_country: order.shippingAddress?.country || 'India',
      shipping_zipcode: order.shippingAddress?.pincode || '',
      shipping_phone: order.customer?.phone || '',
      shipping_email: order.customer?.email || '',
      billing_address: order.shippingAddress?.line1 || '',
      billing_city: order.shippingAddress?.city || '',
      billing_state: order.shippingAddress?.state || '',
      billing_country: order.shippingAddress?.country || 'India',
      billing_zipcode: order.shippingAddress?.pincode || '',
      warehouse_id: warehouseAddress.shipwayWarehouseId || '',
      box_length: '10',
      box_breadth: '10',
      box_height: '10',
      weight: '500',
    };
    const { data } = await this.client.post('/pushOrderData', payload);
    return { awbCode: data.awb || data.AWB, courierName: data.carrier_name || 'Shipway', raw: data };
  }

  async trackShipment(awb) {
    const { data } = await this.client.get('/getshipmentstatus', { params: { awb } });
    return { awbCode: awb, currentStatus: data.current_status, activities: data.scan || [] };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.post('/cancelOrder', {
      order_ids: Array.isArray(awb) ? awb : [awb],
    });
    return data;
  }

  async getPickupLocations() {
    const { data } = await this.client.get('/getwarehouses');
    return data.message || [];
  }
}

module.exports = ShipwayAdapter;
