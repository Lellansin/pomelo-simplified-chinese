var ConnectionService = require('../common/service/connectionService');

/**
 * 连接组件, 用于统计前端服务器的连接状态
 */
module.exports = function(app) {
  return new Component(app);
};

var Component = function(app) {
  this.app = app;
  this.service = new ConnectionService(app);

  // 代理service的除了组件的生命周期接口的方法
  var method, self = this;

  var getFun = function(m) {
    return (function() {
          return function() {
            return self.service[m].apply(self.service, arguments);
          };
    })();
  };

  for(var m in this.service) {
    if(m !== 'start' && m !== 'stop') {
      method = this.service[m];
      if(typeof method === 'function') {
        this[m] = getFun(m);
      }
    }
  }
};

Component.prototype.name = '__connection__';
