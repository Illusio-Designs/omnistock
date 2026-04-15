const axios = require('axios');

// Ecom Express API
// Credentials: { username, password }
// Apply at: https://ecomexpress.in

const BASE = 'https://api.ecomexpress.in/apiv2';

class EcomExpressAdapter {
  constructor(credentials) {
    this.username = credentials.username;
    this.password = credentials.password;
  }

  _form(extra = {}) {
    return new URLSearchParams({ username: this.username, password: this.password, ...extra });
  }

  async testConnection() {
    const { data } = await axios.post(`${BASE}/fetch_awb/`, this._form({ count: 1, type: 'EXPP' }));
    return { success: true, username: this.username, tokenAvailable: !!data };
  }

  async checkServiceability({ pickupPincode, deliveryPincode }) {
    const { data } = await axios.post(
      `${BASE}/pincodes/`,
      this._form({ orginpincode: pickupPincode, destinationpincode: deliveryPincode })
    );
    return data;
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = this._form({
      json_input: JSON.stringify([{
        AWB_NUMBER: '',
        ORDER_NUMBER: order.orderNumber,
        PRODUCT: order.paymentStatus === 'PAID' ? 'PPD' : 'COD',
        CONSIGNEE: order.customer?.name || '',
        CONSIGNEE_ADDRESS1: order.shippingAddress?.line1 || '',
        CONSIGNEE_ADDRESS2: order.shippingAddress?.line2 || '',
        DESTINATION_CITY: order.shippingAddress?.city || '',
        STATE: order.shippingAddress?.state || '',
        PINCODE: order.shippingAddress?.pincode || '',
        TELEPHONE: order.customer?.phone || '',
        ITEM_DESCRIPTION: order.items?.[0]?.variant?.name || 'Item',
        PIECES: order.items?.length || 1,
        COLLECTABLE_VALUE: order.paymentStatus === 'PAID' ? 0 : order.total,
        DECLARED_VALUE: order.total,
        ACTUAL_WEIGHT: 0.5,
        PICKUP_NAME: warehouseAddress.name || 'Primary',
        PICKUP_ADDRESS_LINE1: warehouseAddress.line1 || '',
        PICKUP_PINCODE: warehouseAddress.pincode || '',
        PICKUP_PHONE: warehouseAddress.phone || '',
        RETURN_NAME: warehouseAddress.name || 'Primary',
        RETURN_ADDRESS_LINE1: warehouseAddress.line1 || '',
        RETURN_PINCODE: warehouseAddress.pincode || '',
        RETURN_PHONE: warehouseAddress.phone || '',
      }]),
    });
    const { data } = await axios.post(`${BASE}/manifest_awb/`, payload);
    const shipment = data.shipments?.[0];
    return { awbCode: shipment?.awb, courierName: 'Ecom Express', raw: data };
  }

  async trackShipment(awb) {
    const { data } = await axios.post(`${BASE}/track_me/`, this._form({ awb }));
    return { awbCode: awb, currentStatus: data.shipments?.[0]?.status, raw: data };
  }

  async cancelShipment(awbs) {
    const list = Array.isArray(awbs) ? awbs : [awbs];
    const { data } = await axios.post(`${BASE}/cancel_awb/`, this._form({ awbs: list.join(',') }));
    return data;
  }
}

module.exports = EcomExpressAdapter;
