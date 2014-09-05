/**
 * 监听组件.
 * 加载并开启监听客户端
 */
var Monitor = require('../monitor/monitor');



/**
 * 组件工厂函数
 *
 * @param  {Object} app  当前 app
 * @return {Object}      组件实例
 */
module.exports = function(app, opts) {
  return new Component(app, opts);
};

var Component = function(app, opts) {
  this.monitor = new Monitor(app, opts);
};

var pro = Component.prototype;

pro.name = '__monitor__';

pro.start = function(cb) {
  this.monitor.start(cb);
};

pro.stop = function(force, cb) {
  this.monitor.stop(cb);
};

pro.reconnect = function(masterInfo) {
  this.monitor.reconnect(masterInfo);
};
