const axios = require('axios');

// Credentials shape: { token: "your_api_token", mode: "test" | "production" }
// Get your token from: https://app.delhivery.com → Settings → API

class DelhiveryAdapter {
  constructor(credentials) {
    const isTest = credentials.mode === 'test';
    this.baseUrl = isTest
      ? 'https://staging-express.delhivery.com'
      : 'https://track.delhivery.com';
    this.headers = {
      Authorization: `Token ${credentials.token}`,
      'Content-Type': 'application/json',
    };
  }

  async _req(method, path, payload = null, params = {}) {
    const { data } = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      headers: this.headers,
      params,
      data: payload,
    });
    return data;
  }

  async testConnection() {
    const data = await this._req('GET', '/api/p/edit-plan/');
    return { success: true, plan: data?.plan };
  }

  // Check serviceability between two pincodes
  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod = false }) {
    const data = await this._req('GET', '/c/api/v1/serviceability/', null, {
      md: 'E',       // Express mode
      ss: 'Delivered',
      d_pin: deliveryPincode,
      o_pin: pickupPincode,
      cgm: weight * 1000, // grams
      pt: cod ? 'COD' : 'Pre-paid',
      cod: cod ? 1 : 0,
    });
    return data?.data?.map(s => ({
      courier: s.courier_name,
      serviceability: s.serviceability,
      tat: s.tat,
      chargedWeight: s.charged_weight,
      codCharges: s.cod_charges,
      totalCharge: s.total_charge,
    })) || [];
  }

  // Create a forward shipment waybill
  async createShipment(order, warehouseAddress) {
    const shipmentData = {
      format: 'json',
      data: JSON.stringify({
        shipments: [{
          name: order.customer?.name || 'Customer',
          add: `${order.shippingAddress?.line1 || ''} ${order.shippingAddress?.line2 || ''}`.trim(),
          pin: order.shippingAddress?.pincode || '',
          city: order.shippingAddress?.city || '',
          state: order.shippingAddress?.state || '',
          country: 'India',
          phone: order.customer?.phone || '',
          order: order.orderNumber,
          payment_mode: order.paymentStatus === 'PAID' ? 'Prepaid' : 'COD',
          return_pin: warehouseAddress?.pincode || '',
          return_city: warehouseAddress?.city || '',
          return_phone: warehouseAddress?.phone || '',
          return_name: warehouseAddress?.name || 'Omnistock',
          return_add: warehouseAddress?.line1 || '',
          return_state: warehouseAddress?.state || '',
          return_country: 'India',
          products_desc: order.items?.map(i => i.variant?.name || 'Item').join(', ') || 'Items',
          hsn_code: '',
          cod_amount: order.paymentStatus !== 'PAID' ? parseFloat(order.total) : 0,
          order_date: new Date(order.orderedAt).toISOString(),
          total_amount: parseFloat(order.total),
          seller_add: warehouseAddress?.line1 || '',
          seller_name: warehouseAddress?.name || 'Omnistock',
          seller_inv: order.orderNumber,
          quantity: order.items?.reduce((s, i) => s + i.qty, 0) || 1,
          weight: 500, // grams, default
          shipment_length: 10,
          shipment_width: 10,
          shipment_height: 10,
          waybill: '',        // leave blank; Delhivery will assign
          seller_gst_tin: warehouseAddress?.gstin || '',
          shipping_mode: 'Surface',
        }],
        pickup_location: { name: warehouseAddress?.pickupLocationName || 'Primary' },
      }),
    };

    const formData = new URLSearchParams(shipmentData);
    const { data } = await axios.post(`${this.baseUrl}/api/cmu/create.json`, formData, {
      headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const pkg = data?.packages?.[0];
    return {
      waybill: pkg?.waybill,
      status: pkg?.status,
      remarks: pkg?.remarks,
    };
  }

  // Track one or more waybills
  async trackShipment(waybill) {
    const data = await this._req('GET', '/api/v1/packages/json/', null, {
      waybill,
      verbose: 1,
    });
    const pkg = data?.ShipmentData?.[0]?.Shipment;
    if (!pkg) return { waybill, status: 'Not found' };
    return {
      waybill,
      status: pkg.Status?.Status,
      expectedDelivery: pkg.ExpectedDeliveryDate,
      destination: pkg.Destination,
      origin: pkg.Origin,
      scans: pkg.Scans?.map(s => ({
        date: s.ScanDetail?.ScanDateTime,
        activity: s.ScanDetail?.Scan,
        location: s.ScanDetail?.ScannedLocation,
      })) || [],
    };
  }

  // Cancel a waybill
  async cancelShipment(waybill) {
    const data = await this._req('POST', '/api/p/edit-plan/', {
      waybill,
      cancel: true,
    });
    return data;
  }

  // Get pickup locations
  async getPickupLocations() {
    const data = await this._req('GET', '/api/backend/clientwarehouse/pickup/');
    return data?.data || [];
  }
}

module.exports = DelhiveryAdapter;
