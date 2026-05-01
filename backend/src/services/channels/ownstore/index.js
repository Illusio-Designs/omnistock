module.exports = {
  ShopifyAdapter:        require('./shopify'),
  WooCommerceAdapter:    require('./woocommerce'),
  AmazonSmartBizAdapter: require('./amazon-smartbiz'),
  MagentoAdapter:        require('./magento'),
  BigCommerceAdapter:    require('./bigcommerce'),
  OpenCartAdapter:       require('./opencart'),
  CustomWebhookAdapter:  require('./custom-webhook'),
  ...require('./pending'),
};
