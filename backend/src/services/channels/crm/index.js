// CRM / Marketing / Customer Service adapters.
// Primary methods: pushContact, pushOrder (for revenue tracking),
// createTicket, sendEmail.

const { BaseAdapter, bearerClient, basicClient } = require('../_base');
const axios = require('axios');

class CrmBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: 'CRM integration' }; }
  async pushContact() { throw new Error('pushContact not implemented'); }
}

// HubSpot
class HubSpotAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.hubapi.com', creds.accessToken); }
  async pushContact(contact) {
    const { data } = await this.client.post('/crm/v3/objects/contacts', { properties: { email: contact.email, firstname: contact.firstName, lastname: contact.lastName, phone: contact.phone } });
    return { id: data.id, raw: data };
  }
  async pushOrder(order) {
    const { data } = await this.client.post('/crm/v3/objects/deals', { properties: { dealname: order.orderNumber, amount: String(order.total), dealstage: 'closedwon' } });
    return { id: data.id, raw: data };
  }
}

// Salesforce CRM
class SalesforceCrmAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = bearerClient(`${creds.instanceUrl}/services/data/v59.0`, creds.accessToken); }
  async pushContact(contact) {
    const { data } = await this.client.post('/sobjects/Contact', { Email: contact.email, FirstName: contact.firstName, LastName: contact.lastName, Phone: contact.phone });
    return { id: data.id, raw: data };
  }
}

// Zoho CRM
class ZohoCrmAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://www.zohoapis.in/crm/v5', headers: { Authorization: `Zoho-oauthtoken ${creds.accessToken}` } }); }
  async pushContact(contact) {
    const { data } = await this.client.post('/Contacts', { data: [{ Email: contact.email, First_Name: contact.firstName, Last_Name: contact.lastName, Phone: contact.phone }] });
    return { id: data?.data?.[0]?.details?.id, raw: data };
  }
}

// Mailchimp
class MailchimpAdapter extends CrmBase {
  constructor(creds) { super(creds); const dc = creds.apiKey.split('-')[1] || 'us1'; this.client = basicClient(`https://${dc}.api.mailchimp.com/3.0`, 'anystring', creds.apiKey); this.listId = creds.audienceId; }
  async pushContact(contact) {
    const { data } = await this.client.post(`/lists/${this.listId}/members`, { email_address: contact.email, status: 'subscribed', merge_fields: { FNAME: contact.firstName, LNAME: contact.lastName } });
    return { id: data.id, raw: data };
  }
}

// Klaviyo
class KlaviyoAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://a.klaviyo.com/api', headers: { Authorization: `Klaviyo-API-Key ${creds.privateKey}`, revision: '2024-02-15', accept: 'application/json' } }); }
  async pushContact(contact) {
    const { data } = await this.client.post('/profiles/', { data: { type: 'profile', attributes: { email: contact.email, first_name: contact.firstName, last_name: contact.lastName } } });
    return { id: data?.data?.id, raw: data };
  }
}

// Brevo (Sendinblue)
class BrevoAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://api.brevo.com/v3', headers: { 'api-key': creds.apiKey, 'Content-Type': 'application/json' } }); }
  async pushContact(contact) {
    const { data } = await this.client.post('/contacts', { email: contact.email, attributes: { FIRSTNAME: contact.firstName, LASTNAME: contact.lastName } });
    return { id: data?.id, raw: data };
  }
}

// WebEngage
class WebEngageAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: `https://api.webengage.com/v1/accounts/${creds.licenseCode}`, headers: { Authorization: `Bearer ${creds.apiKey}`, 'Content-Type': 'application/json' } }); }
  async pushContact(contact) { const { data } = await this.client.post('/users', { userId: contact.userId, email: contact.email, firstName: contact.firstName }); return { raw: data }; }
}

// MoEngage
class MoEngageAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: `https://api-${creds.dataCenter || '01'}.moengage.com/v1`, auth: { username: creds.appId, password: creds.dataApiKey } }); }
  async pushContact(contact) { const { data } = await this.client.post('/customer', { customer_id: contact.userId, attributes: { email: contact.email, name: contact.firstName } }); return { raw: data }; }
}

// CleverTap
class CleverTapAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://api.clevertap.com/1', headers: { 'X-CleverTap-Account-Id': creds.accountId, 'X-CleverTap-Passcode': creds.passcode, 'Content-Type': 'application/json' } }); }
  async pushContact(contact) { const { data } = await this.client.post('/upload', { d: [{ identity: contact.userId, type: 'profile', profileData: { email: contact.email, name: contact.firstName } }] }); return { raw: data }; }
}

// Freshdesk (helpdesk)
class FreshdeskAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = basicClient(`https://${creds.domain}.freshdesk.com/api/v2`, creds.apiKey, 'X'); }
  async createTicket(ticket) { const { data } = await this.client.post('/tickets', { email: ticket.email, subject: ticket.subject, description: ticket.body, priority: 1, status: 2 }); return { id: data.id, raw: data }; }
  async pushContact(contact) { const { data } = await this.client.post('/contacts', { name: contact.firstName + ' ' + (contact.lastName || ''), email: contact.email, phone: contact.phone }); return { id: data.id, raw: data }; }
}

// Zendesk (helpdesk)
class ZendeskAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = basicClient(`https://${creds.subdomain}.zendesk.com/api/v2`, `${creds.email}/token`, creds.apiToken); }
  async createTicket(ticket) { const { data } = await this.client.post('/tickets.json', { ticket: { subject: ticket.subject, comment: { body: ticket.body }, requester: { email: ticket.email } } }); return { id: data?.ticket?.id, raw: data }; }
  async pushContact(contact) { const { data } = await this.client.post('/users.json', { user: { email: contact.email, name: contact.firstName + ' ' + (contact.lastName || '') } }); return { id: data?.user?.id, raw: data }; }
}

// Gorgias
class GorgiasAdapter extends CrmBase {
  constructor(creds) { super(creds); this.client = basicClient(`https://${creds.subdomain}.gorgias.com/api`, creds.username, creds.apiKey); }
  async createTicket(ticket) { const { data } = await this.client.post('/tickets', { customer: { email: ticket.email }, subject: ticket.subject, messages: [{ source: { type: 'email' }, body_html: ticket.body, sender: { email: ticket.email }, channel: 'email' }] }); return { id: data.id, raw: data }; }
}

module.exports = {
  HubSpotAdapter, SalesforceCrmAdapter, ZohoCrmAdapter, MailchimpAdapter,
  KlaviyoAdapter, BrevoAdapter, WebEngageAdapter, MoEngageAdapter,
  CleverTapAdapter, FreshdeskAdapter, ZendeskAdapter, GorgiasAdapter,
};
