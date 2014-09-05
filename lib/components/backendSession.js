var BackendSessionService = require('../common/service/backendSessionService');

module.exports = function(app) {
  var service = new BackendSessionService(app);
  service.name = '__backendSession__';
  // 导出后端 session 服务到 app
  app.set('backendSessionService', service, true);

  // 用于兼容被更名为 `BackendSession` 的 `LocalSession`
  app.set('localSessionService', service, true);

  return service;
};
