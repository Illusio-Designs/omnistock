const axios = require('axios');

// BlueDart (DHL Group) API
// Credentials: { loginId, password, licenseKey }
// Apply at: https://www.bluedart.com/api

const BASE = 'https://apigateway.bluedart.com/in/transportation';

class BlueDartAdapter {
  constructor(credentials) {
    this.loginId = credentials.loginId;
    this.password = credentials.password;
    this.licenseKey = credentials.licenseKey;
    this._jwtToken = null;
    this._tokenExpiry = 0;
  }

  async _getJwt() {
    if (this._jwtToken && this._tokenExpiry > Date.now()) return this._jwtToken;
    const { data } = await axios.get(`${BASE}/token/v1/login`, {
      headers: {
        ClientID: this.loginId,
        clientSecret: this.password,
        'Content-Type': 'application/json',
      },
    });
    this._jwtToken = data.JWTToken;
    this._tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return this._jwtToken;
  }

  async _req(method, path, payload = null) {
    const jwt = await this._getJwt();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: { JWTToken: jwt, 'Content-Type': 'application/json' },
      data: payload,
    });
    return data;
  }

  async testConnection() {
    await this._getJwt();
    return { success: true, loginId: this.loginId };
  }

  async checkServiceability({ pickupPincode, deliveryPincode, weight }) {
    const data = await this._req('POST', '/waybill/v1/GetServicesforPincode', {
      pinCode: deliveryPincode,
      profile: { LoginID: this.loginId, LicenceKey: this.licenseKey, Api_type: 'S' },
    });
    return data;
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      Request: {
        Consignee: {
          ConsigneeName: order.customer?.name || '',
          ConsigneeAddress1: order.shippingAddress?.line1 || '',
          ConsigneeAddress2: order.shippingAddress?.line2 || '',
          ConsigneePincode: order.shippingAddress?.pincode || '',
          ConsigneeMobile: order.customer?.phone || '',
        },
        Services: {
          AWBNo: '',
          ActualWeight: 0.5,
          CollectableAmount: order.paymentStatus === 'PAID' ? 0 : parseFloat(order.total),
          Commodity: { CommodityDetail1: order.items?.[0]?.variant?.name || 'Item' },
          CreditReferenceNo: order.orderNumber,
          DeclaredValue: parseFloat(order.total),
          PickupDate: new Date().toISOString(),
          PieceCount: String(order.items?.length || 1),
          ProductCode: order.paymentStatus === 'PAID' ? 'A' : 'D',
          SubProductCode: order.paymentStatus === 'PAID' ? 'P' : 'C',
        },
        Shipper: {
          CustomerAddress1: warehouseAddress.line1 || '',
          CustomerName: warehouseAddress.name || 'Warehouse',
          CustomerPincode: warehouseAddress.pincode || '',
          CustomerMobile: warehouseAddress.phone || '',
          OriginArea: warehouseAddress.city || '',
        },
      },
      Profile: { Api_type: 'S', LicenceKey: this.licenseKey, LoginID: this.loginId },
    };
    const data = await this._req('POST', '/waybill/v1/GenerateWayBill', payload);
    return {
      awbCode: data.AWBNo,
      courierName: 'BlueDart',
      raw: data,
    };
  }

  async trackShipment(awb) {
    const data = await this._req('POST', '/tracking/v1/shipment', {
      awbNumber: awb,
      profile: { LoginID: this.loginId, LicenceKey: this.licenseKey, Api_type: 'S' },
    });
    return { awbCode: awb, currentStatus: data.ShipmentData?.[0]?.Status, raw: data };
  }

  async cancelShipment(awb) {
    const data = await this._req('POST', '/waybill/v1/CancelWaybill', {
      AWBNo: awb,
      Profile: { Api_type: 'S', LicenceKey: this.licenseKey, LoginID: this.loginId },
    });
    return data;
  }
}

module.exports = BlueDartAdapter;
