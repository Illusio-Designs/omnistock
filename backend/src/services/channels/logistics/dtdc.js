const axios = require('axios');

// DTDC API
// Credentials: { apiKey, customerId }
// Apply at: https://www.dtdc.in/dtdc-api

const BASE = 'https://apigateway.dtdc.in/apigateway/api';

class DTDCAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.customerId = credentials.customerId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'api-key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/customer/profile', {
      params: { customerCode: this.customerId },
    });
    return { success: true, customerId: this.customerId, name: data.name };
  }

  async checkServiceability({ deliveryPincode }) {
    const { data } = await this.client.get('/pincode/serviceability', {
      params: { pincode: deliveryPincode },
    });
    return data;
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      consignments: [{
        customer_code: this.customerId,
        reference_number: order.orderNumber,
        service_type_id: order.paymentStatus === 'PAID' ? 'PRIORITY' : 'GROUND EXPRESS',
        load_type: 'NON-DOCUMENT',
        commodity_id: 'Others',
        description: order.items?.[0]?.variant?.name || 'Item',
        num_pieces: String(order.items?.length || 1),
        weight: '0.5',
        cod_amount: order.paymentStatus === 'PAID' ? '0' : String(order.total),
        declared_value: String(order.total),
        origin_details: {
          name: warehouseAddress.name || 'Warehouse',
          phone: warehouseAddress.phone || '',
          address_line_1: warehouseAddress.line1 || '',
          pincode: warehouseAddress.pincode || '',
          city: warehouseAddress.city || '',
          state: warehouseAddress.state || '',
        },
        destination_details: {
          name: order.customer?.name || '',
          phone: order.customer?.phone || '',
          address_line_1: order.shippingAddress?.line1 || '',
          pincode: order.shippingAddress?.pincode || '',
          city: order.shippingAddress?.city || '',
          state: order.shippingAddress?.state || '',
        },
      }],
    };
    const { data } = await this.client.post('/customer/integration/consignment/softdata', payload);
    const c = data.data?.[0];
    return { awbCode: c?.reference_number, courierName: 'DTDC', raw: data };
  }

  async trackShipment(awb) {
    const { data } = await this.client.post('/tracking/shipment', {
      trkType: 'cnno',
      strcnno: awb,
      addtnlDtl: 'Y',
    });
    return { awbCode: awb, currentStatus: data.trackHeader?.strStatus, raw: data };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.post('/customer/integration/consignment/cancel', {
      customer_code: this.customerId,
      awb: awb,
    });
    return data;
  }
}

module.exports = DTDCAdapter;
