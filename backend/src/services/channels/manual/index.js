// ManualAdapter — for channels with no external API (Offline retail, POS,
// Wholesale, Distributor, Other). Tenants enter orders manually via the
// New Order form; this adapter is a no-op that satisfies the adapter
// interface so the channel can be "connected" and appear in lists, cron
// jobs, and webhook routes without errors.

class ManualAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
  }

  async testConnection() {
    return { success: true, message: 'Manual channel — no external API. Enter orders via the New Order form.' };
  }

  // No external orders to pull
  async fetchOrders() {
    return [];
  }

  // No external inventory to push
  async updateInventoryLevel() {
    return { success: true, skipped: true, reason: 'Manual channel — inventory tracked locally only' };
  }

  async bulkUpdateInventory() {
    return { success: true, skipped: true, reason: 'Manual channel' };
  }

  // No external listings
  async updateListing() {
    return { success: true, skipped: true, reason: 'Manual channel' };
  }

  // No automated review request
  async requestReview() {
    return { success: false, skipped: true, reason: 'Manual channel — request reviews offline' };
  }
}

module.exports = { ManualAdapter };
