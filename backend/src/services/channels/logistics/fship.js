const axios = require('axios');

// Credentials shape: { apiKey: "your_fship_api_key" }
// Register at: https://fship.in
// Get API key from: Dashboard → Settings → API

const BASE = 'https://api.fship.in/v1';

class FshipAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/account/profile');
    return {
      success: true,
      name: data.name || data.company_name,
      email: data.email,
    };
  }

  // Get shipping rates between two pincodes
  // params: { pickupPincode, deliveryPincode, weight (kg), cod, orderValue }
  async getRates({ pickupPincode, deliveryPincode, weight, cod = false, orderValue = 0 }) {
    const { data } = await this.client.post('/rates/calculate', {
      pickup_pincode: pickupPincode,
      delivery_pincode: deliveryPincode,
      weight,                          // kg
      cod,
      declared_value: orderValue,
    });

    const couriers = data.data || data.rates || [];
    return couriers.map(c => ({
      courierId: c.courier_id,
      courierName: c.courier_name,
      serviceType: c.service_type,
      estimatedDays: c.estimated_days,
      totalCharge: c.total_charge,
      codCharge: c.cod_charge || 0,
      minWeight: c.min_weight,
    }));
  }

  // Create a shipment / book a courier
  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      order_number: order.orderNumber,
      order_date: new Date(order.orderedAt || order.createdAt).toISOString().split('T')[0],
      payment_type: order.paymentStatus === 'PAID' ? 'prepaid' : 'cod',
      cod_amount: order.paymentStatus !== 'PAID' ? parseFloat(order.total) : 0,

      consignee: {
        name: order.customer?.name || '',
        phone: order.customer?.phone || '',
        email: order.customer?.email || '',
        address: order.shippingAddress?.line1 || '',
        address2: order.shippingAddress?.line2 || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        pincode: order.shippingAddress?.pincode || '',
        country: order.shippingAddress?.country || 'India',
      },

      pickup: {
        name: warehouseAddress?.name || 'Warehouse',
        phone: warehouseAddress?.phone || '',
        address: warehouseAddress?.line1 || '',
        city: warehouseAddress?.city || '',
        state: warehouseAddress?.state || '',
        pincode: warehouseAddress?.pincode || '',
        country: 'India',
      },

      package: {
        weight: 0.5,        // kg — override from order/product if available
        length: 10,         // cm
        breadth: 10,
        height: 10,
        declared_value: parseFloat(order.total),
      },

      items: order.items?.map(i => ({
        name: i.variant?.product?.name || i.variant?.name || 'Item',
        sku: i.variant?.sku || '',
        quantity: i.qty,
        price: parseFloat(i.unitPrice),
      })) || [],
    };

    const { data } = await this.client.post('/shipments/create', payload);
    return {
      shipmentId: data.shipment_id,
      awbCode: data.awb_number || data.awb_code,
      courierName: data.courier_name,
      label: data.label_url,
      status: data.status,
    };
  }

  // Track by AWB
  async trackShipment(awbCode) {
    const { data } = await this.client.get(`/tracking/${awbCode}`);
    const track = data.data || data;
    return {
      awbCode,
      status: track.current_status,
      estimatedDelivery: track.expected_delivery,
      courierName: track.courier_name,
      activities: (track.events || track.activities || []).map(e => ({
        date: e.date || e.timestamp,
        activity: e.description || e.activity,
        location: e.location,
      })),
    };
  }

  // Cancel by AWB
  async cancelShipment(awbCodes) {
    const codes = Array.isArray(awbCodes) ? awbCodes : [awbCodes];
    const { data } = await this.client.post('/shipments/cancel', { awb_numbers: codes });
    return data;
  }

  // List warehouse/pickup addresses configured in Fship
  async getPickupLocations() {
    const { data } = await this.client.get('/pickup/locations');
    return data.data || data.locations || [];
  }

  // Schedule pickup for a list of AWBs
  async schedulePickup(awbCodes, pickupDate) {
    const codes = Array.isArray(awbCodes) ? awbCodes : [awbCodes];
    const { data } = await this.client.post('/pickup/schedule', {
      awb_numbers: codes,
      pickup_date: pickupDate, // YYYY-MM-DD
    });
    return data;
  }
}

module.exports = FshipAdapter;
