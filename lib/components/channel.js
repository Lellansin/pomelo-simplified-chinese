var ChannelService = require('../common/service/channelService');

// 将频道服务器设置到 app 中
module.exports = function(app, opts) {
  var service = new ChannelService(app, opts);
  app.set('channelService', service, true);
  service.name = '__channel__';
  return service;
};