/**
 * 服务器启动组件
 */
var Server = require('../server/server');

/**
 * 组件工厂函数
 *
 * @param {Object} app  当前应用上下文
 * @return {Object}     组件实例
 */
module.exports = function(app, opts) {
	return new Component(app, opts);
};

/**
 * 服务器组件类
 *
 * @param {Object} app  当前应用上下文
 */
var Component = function(app, opts) {
	this.server = Server.create(app, opts);
};

var pro = Component.prototype;

pro.name = '__server__';

/**
 * 组件生命周期回调函数
 *
 * @param {Function} cb
 * @return {Void}
 */
pro.start = function(cb) {
	this.server.start();
	process.nextTick(cb);
};

/**
 * 组件生命周期回调函数
 *
 * @param {Function} cb
 * @return {Void}
 */
Component.prototype.afterStart = function(cb) {
	this.server.afterStart();
	process.nextTick(cb);
};

/**
 * 组件生命周期回调函数
 *
 * @param {Boolean}  force 是否马上停止组件
 * @param {Function}  cb
 * @return {Void}
 */
pro.stop = function(force, cb) {
	this.server.stop();
	process.nextTick(cb);
};

/**
 * 代理服务器处理
 */
pro.handle = function(msg, session, cb) {
	this.server.handle(msg, session, cb);
};

/**
 * 代理服务器全局处理
 */
Component.prototype.globalHandle = function(msg, session, cb) {
	this.server.globalHandle(msg, session, cb);
};