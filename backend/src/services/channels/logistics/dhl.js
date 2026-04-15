const axios = require('axios');

// DHL Express API (MyDHL)
// Credentials: { apiKey, accountNo }
// Docs: https://developer.dhl.com/api-reference

const BASE = 'https://express.api.dhl.com/mydhlapi';

class DHLAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.accountNo = credentials.accountNo;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'Authorization': `Basic ${Buffer.from(credentials.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/address-validate', {
      params: { type: 'delivery', countryCode: 'IN', postalCode: '110001' },
    });
    return { success: true, accountNo: this.accountNo, available: !!data };
  }

  async getRates({ pickupPincode, deliveryPincode, weight }) {
    const { data } = await this.client.get('/rates', {
      params: {
        accountNumber: this.accountNo,
        originCountryCode: 'IN',
        originPostalCode: pickupPincode,
        destinationCountryCode: 'IN',
        destinationPostalCode: deliveryPincode,
        weight: weight || 0.5,
        unitOfMeasurement: 'metric',
        plannedShippingDate: new Date().toISOString().split('T')[0],
        isCustomsDeclarable: false,
      },
    });
    return data.products || [];
  }

  async createShipment(order, channel, warehouseAddress) {
    const payload = {
      plannedShippingDateAndTime: new Date().toISOString(),
      productCode: 'P',
      accounts: [{ typeCode: 'shipper', number: this.accountNo }],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: warehouseAddress.pincode,
            cityName: warehouseAddress.city,
            countryCode: 'IN',
            addressLine1: warehouseAddress.line1,
          },
          contactInformation: {
            phone: warehouseAddress.phone || '',
            companyName: warehouseAddress.name || 'Warehouse',
            fullName: warehouseAddress.contactName || warehouseAddress.name || 'Warehouse',
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: order.shippingAddress?.pincode,
            cityName: order.shippingAddress?.city,
            countryCode: 'IN',
            addressLine1: order.shippingAddress?.line1,
          },
          contactInformation: {
            phone: order.customer?.phone || '',
            companyName: order.customer?.name || '',
            fullName: order.customer?.name || '',
          },
        },
      },
      content: {
        packages: [{
          weight: 0.5,
          dimensions: { length: 10, width: 10, height: 10 },
          customerReferences: [{ value: order.orderNumber, typeCode: 'CU' }],
        }],
        isCustomsDeclarable: false,
        description: order.items?.[0]?.variant?.name || 'Item',
        incoterm: 'DAP',
        unitOfMeasurement: 'metric',
      },
    };
    const { data } = await this.client.post('/shipments', payload);
    return {
      awbCode: data.shipmentTrackingNumber,
      courierName: 'DHL',
      labelUrl: data.documents?.[0]?.url,
    };
  }

  async trackShipment(awb) {
    const { data } = await this.client.get(`/shipments/${awb}/tracking`);
    const s = data.shipments?.[0];
    return { awbCode: awb, currentStatus: s?.status, activities: s?.events || [] };
  }

  async cancelShipment(awb) {
    const { data } = await this.client.delete(`/shipments/${awb}`);
    return data;
  }
}

module.exports = DHLAdapter;
