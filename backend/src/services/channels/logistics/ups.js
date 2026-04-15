const axios = require('axios');

// UPS API (OAuth 2.0)
// Credentials: { clientId, clientSecret, accountNo }
// Docs: https://developer.ups.com/api/reference

const BASE = 'https://onlinetools.ups.com';

class UPSAdapter {
  constructor(credentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.accountNo = credentials.accountNo;
    this._token = null;
    this._tokenExpiry = 0;
  }

  async _getToken() {
    if (this._token && this._tokenExpiry > Date.now()) return this._token;
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${BASE}/security/v1/oauth/token`,
      new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._token;
  }

  async _req(method, path, payload) {
    const token = await this._getToken();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: payload,
    });
    return data;
  }

  async testConnection() {
    await this._getToken();
    return { success: true, accountNo: this.accountNo };
  }

  async getRates({ pickupPincode, deliveryPincode, weight }) {
    const data = await this._req('POST', '/api/rating/v1/Rate', {
      RateRequest: {
        Shipment: {
          Shipper: { ShipperNumber: this.accountNo, Address: { PostalCode: pickupPincode, CountryCode: 'IN' } },
          ShipTo: { Address: { PostalCode: deliveryPincode, CountryCode: 'IN' } },
          Package: {
            PackagingType: { Code: '02' },
            PackageWeight: { UnitOfMeasurement: { Code: 'KGS' }, Weight: String(weight || 0.5) },
          },
        },
      },
    });
    return data.RateResponse?.RatedShipment || [];
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      ShipmentRequest: {
        Shipment: {
          Description: order.items?.[0]?.variant?.name || 'Item',
          Shipper: {
            Name: warehouseAddress.name || 'Warehouse',
            ShipperNumber: this.accountNo,
            Phone: { Number: warehouseAddress.phone || '' },
            Address: {
              AddressLine: [warehouseAddress.line1 || ''],
              City: warehouseAddress.city || '',
              PostalCode: warehouseAddress.pincode || '',
              CountryCode: 'IN',
            },
          },
          ShipTo: {
            Name: order.customer?.name || '',
            Phone: { Number: order.customer?.phone || '' },
            Address: {
              AddressLine: [order.shippingAddress?.line1 || ''],
              City: order.shippingAddress?.city || '',
              PostalCode: order.shippingAddress?.pincode || '',
              CountryCode: 'IN',
            },
          },
          Service: { Code: '11' },
          Package: {
            Description: order.items?.[0]?.variant?.name || 'Item',
            Packaging: { Code: '02' },
            PackageWeight: { UnitOfMeasurement: { Code: 'KGS' }, Weight: '0.5' },
            ReferenceNumber: { Value: order.orderNumber },
          },
        },
        LabelSpecification: { LabelImageFormat: { Code: 'GIF' } },
      },
    };
    const data = await this._req('POST', '/api/shipments/v1/ship', payload);
    const result = data.ShipmentResponse?.ShipmentResults;
    return {
      awbCode: result?.ShipmentIdentificationNumber,
      courierName: 'UPS',
      labelUrl: result?.PackageResults?.ShippingLabel?.GraphicImage,
    };
  }

  async trackShipment(awb) {
    const data = await this._req('GET', `/api/track/v1/details/${awb}`);
    const shipment = data.trackResponse?.shipment?.[0]?.package?.[0];
    return {
      awbCode: awb,
      currentStatus: shipment?.currentStatus?.description,
      activities: shipment?.activity || [],
    };
  }

  async cancelShipment(awb) {
    const data = await this._req('DELETE', `/api/shipments/v1/void/cancel/${awb}`);
    return data;
  }
}

module.exports = UPSAdapter;
