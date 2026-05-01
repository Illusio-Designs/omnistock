module.exports = {
  BlinkitAdapter:          require('./blinkit'),
  ZeptoAdapter:            require('./zepto'),
  SwiggyInstamartAdapter:  require('./swiggy-instamart'),
  BBNowAdapter:            require('./bb-now'),
  ...require('./pending'),
};
