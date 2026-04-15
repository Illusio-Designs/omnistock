const axios = require('axios');

// iThink Logistics — multi-courier shipping aggregator
// Credentials: { accessToken, secretKey }
// Apply at: https://www.ithinklogistics.com
// Docs: https://www.ithinklogistics.com/developer

const BASE = 'https://pre-alpha.ithinklogistics.com/api_v3';

class IThinkAdapter {
  constructor(credentials) {
    this.accessToken = credentials.accessToken;
    this.secretKey = credentials.secretKey;
    this.client = axios.create({
      baseURL: BASE,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  _auth(extra = {}) {
    return {
      access_token: this.accessToken,
      secret_key: this.secretKey,
      ...extra,
    };
  }

  async testConnection() {
    const { data } = await this.client.post('/user_login/userLogin', this._auth());
    return { success: data.status === 'Success', message: data.message || 'Connected' };
  }

  // Check serviceability & get rate estimate
  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod = false, orderValue = 0 }) {
    const payload = this._auth({
      pickup_pincode: pickupPincode,
      delivery_pincode: deliveryPincode,
      weight: (weight || 0.5) * 1000,
      payment_mode: cod ? 'COD' : 'PREPAID',
      order_amount: orderValue,
    });
    const { data } = await this.client.post('/courier_serviceability/getRates', payload);
    return data.data || [];
  }

  async getRates(params) {
    return this.checkServiceability(params);
  }

  // Create a forward shipment
  async createShipment(order, channel, warehouseAddress) {
    const payload = this._auth({
      shipments: [{
        waybill: '',
        order: order.orderNumber,
        sub_order: order.orderNumber,
        order_date: new Date(order.orderedAt).toISOString().split('T')[0],
        total_amount: parseFloat(order.total),
        name: order.customer?.name || '',
        company_name: '',
        add: order.shippingAddress?.line1 || '',
        add2: order.shippingAddress?.line2 || '',
        add3: '',
        pin: order.shippingAddress?.pincode || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        country: order.shippingAddress?.country || 'India',
        phone: order.customer?.phone || '',
        alt_phone: '',
        email: order.customer?.email || '',
        is_billing_same_as_shipping: 'yes',
        products: (order.items || []).map(i => ({
          product_name: i.variant?.name || 'Item',
          product_sku: i.variant?.sku || '',
          product_quantity: String(i.qty),
          product_price: String(i.unitPrice),
          product_tax_rate: '0',
          product_hsn_code: '',
          product_discount: String(i.discount || 0),
        })),
        shipment_length: '10',
        shipment_width: '10',
        shipment_height: '10',
        weight: '500',
        payment_mode: order.paymentStatus === 'PAID' ? 'prepaid' : 'cod',
        cod_amount: order.paymentStatus === 'PAID' ? '0' : String(order.total),
        pickup_name: warehouseAddress.name || 'Primary',
        pickup_phone: warehouseAddress.phone || '',
        pickup_address_1: warehouseAddress.line1 || '',
        pickup_address_2: warehouseAddress.line2 || '',
        pickup_city: warehouseAddress.city || '',
        pickup_state: warehouseAddress.state || '',
        pickup_pincode: warehouseAddress.pincode || '',
        return_address_1: warehouseAddress.line1 || '',
        return_city: warehouseAddress.city || '',
        return_state: warehouseAddress.state || '',
        return_pincode: warehouseAddress.pincode || '',
        return_phone: warehouseAddress.phone || '',
      }],
    });
    const { data } = await this.client.post('/shipment/createShipment', payload);
    const s = data.data?.shipments?.[0];
    return {
      awbCode: s?.waybill || s?.awb,
      courierName: s?.courier_name || 'iThink',
      shipmentId: s?.reference_number,
      raw: data,
    };
  }

  // Track by AWB
  async trackShipment(awb) {
    const { data } = await this.client.post('/shipment/trackShipment', this._auth({ awb }));
    const track = data.data?.[0];
    return {
      awbCode: awb,
      currentStatus: track?.status,
      courierName: track?.courier_name,
      activities: track?.scans || [],
    };
  }

  // Cancel a shipment
  async cancelShipment(awbs) {
    const list = Array.isArray(awbs) ? awbs : [awbs];
    const { data } = await this.client.post('/shipment/cancelShipment', this._auth({ waybill: list.join(',') }));
    return data;
  }

  // Get configured pickup locations
  async getPickupLocations() {
    const { data } = await this.client.post('/warehouse/getWarehouse', this._auth());
    return data.data || [];
  }
}

module.exports = IThinkAdapter;
