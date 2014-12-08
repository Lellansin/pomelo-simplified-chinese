var logger = require('pomelo-logger');

/**
 * 配置 pomelo 日志
 */
module.exports.configure = function(app, filename) {
  var serverId = app.getServerId();
  var base = app.getBase();
  logger.configure(filename, {serverId: serverId, base: base});
};
