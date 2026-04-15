const axios = require('axios');

// FedEx API (OAuth 2.0)
// Credentials: { apiKey, secretKey, accountNo }
// Docs: https://developer.fedex.com/api/en-in/catalog.html

const BASE = 'https://apis.fedex.com';

class FedExAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    this.accountNo = credentials.accountNo;
    this._token = null;
    this._tokenExpiry = 0;
  }

  async _getToken() {
    if (this._token && this._tokenExpiry > Date.now()) return this._token;
    const { data } = await axios.post(
      `${BASE}/oauth/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.secretKey,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US',
      },
      data: payload,
    });
    return data;
  }

  async testConnection() {
    await this._getToken();
    return { success: true, accountNo: this.accountNo };
  }

  async getRates({ pickupPincode, deliveryPincode, weight, orderValue }) {
    const data = await this._req('POST', '/rate/v1/rates/quotes', {
      accountNumber: { value: this.accountNo },
      requestedShipment: {
        shipper: { address: { postalCode: pickupPincode, countryCode: 'IN' } },
        recipient: { address: { postalCode: deliveryPincode, countryCode: 'IN' } },
        pickupType: 'USE_SCHEDULED_PICKUP',
        rateRequestType: ['ACCOUNT'],
        requestedPackageLineItems: [{
          weight: { units: 'KG', value: weight || 0.5 },
          declaredValue: { amount: orderValue || 0, currency: 'INR' },
        }],
      },
    });
    return data.output?.rateReplyDetails || [];
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      labelResponseOptions: 'URL_ONLY',
      accountNumber: { value: this.accountNo },
      requestedShipment: {
        shipper: {
          contact: { personName: warehouseAddress.name, phoneNumber: warehouseAddress.phone },
          address: {
            streetLines: [warehouseAddress.line1],
            city: warehouseAddress.city,
            postalCode: warehouseAddress.pincode,
            countryCode: 'IN',
          },
        },
        recipients: [{
          contact: { personName: order.customer?.name, phoneNumber: order.customer?.phone },
          address: {
            streetLines: [order.shippingAddress?.line1],
            city: order.shippingAddress?.city,
            postalCode: order.shippingAddress?.pincode,
            countryCode: order.shippingAddress?.country === 'India' ? 'IN' : 'IN',
          },
        }],
        serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
        packagingType: 'YOUR_PACKAGING',
        pickupType: 'USE_SCHEDULED_PICKUP',
        shippingChargesPayment: { paymentType: 'SENDER' },
        labelSpecification: { imageType: 'PDF', labelStockType: 'PAPER_85X11_TOP_HALF_LABEL' },
        requestedPackageLineItems: [{
          weight: { units: 'KG', value: 0.5 },
          customerReferences: [{ customerReferenceType: 'CUSTOMER_REFERENCE', value: order.orderNumber }],
        }],
      },
    };
    const data = await this._req('POST', '/ship/v1/shipments', payload);
    const pkg = data.output?.transactionShipments?.[0]?.pieceResponses?.[0];
    return { awbCode: pkg?.trackingNumber, courierName: 'FedEx', labelUrl: pkg?.packageDocuments?.[0]?.url };
  }

  async trackShipment(awb) {
    const data = await this._req('POST', '/track/v1/trackingnumbers', {
      trackingInfo: [{ trackingNumberInfo: { trackingNumber: awb } }],
      includeDetailedScans: true,
    });
    const track = data.output?.completeTrackResults?.[0]?.trackResults?.[0];
    return {
      awbCode: awb,
      currentStatus: track?.latestStatusDetail?.description,
      activities: track?.scanEvents || [],
    };
  }

  async cancelShipment(awb) {
    const data = await this._req('PUT', '/ship/v1/shipments/cancel', {
      accountNumber: { value: this.accountNo },
      trackingNumber: awb,
    });
    return data;
  }
}

module.exports = FedExAdapter;
