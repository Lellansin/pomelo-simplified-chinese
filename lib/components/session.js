var SessionService = require('../common/service/sessionService');

module.exports = function(app, opts) {
  var cmp = new Component(app, opts);
  app.set('sessionService', cmp, true);
  return cmp;
};

/**
 * Session 组件. 管理 sessions.
 *
 * @param {Object} app  当前 app
 * @param {Object} opts 附加参数
 */
var Component = function(app, opts) {
  opts = opts || {};
  this.app = app;
  this.service = new SessionService(opts);

  var getFun = function(m) {
    return (function() {
          return function() {
            return self.service[m].apply(self.service, arguments);
          };
    })();
  };
  // 代理除组件的生命周期接口以外的服务方法
  var method, self = this;
  for(var m in this.service) {
    if(m !== 'start' && m !== 'stop') {
      method = this.service[m];
      if(typeof method === 'function') {
        this[m] = getFun(m);
      }
    }
  }
};

Component.prototype.name = '__session__';
