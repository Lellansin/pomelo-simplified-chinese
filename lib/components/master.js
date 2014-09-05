/**
 * master 组件
 */
var Master = require('../master/master');

/**
 * 组件工厂函数
 *
 * @param  {Object} app  当前 app
 * @return {Object}      组件实例
 */
module.exports = function (app, opts) {
	return new Component(app, opts);
};

/**
* Master 组件类
*
* @param {Object} app  当前 app
*/
var Component = function (app, opts) {
	this.master = new Master(app, opts);
};

var pro = Component.prototype;

pro.name = '__master__';

/**
 * 组件生命周期函数
 *
 * @param  {Function} cb
 * @return {Void}
 */
pro.start = function (cb) {
  this.master.start(cb);
};

/**
 * 组件生命周期函数
 *
 * @param  {Boolean}   force 是否立刻停止组件
 * @param  {Function}  cb
 * @return {Void}
 */
pro.stop = function (force, cb) {
  this.master.stop(cb);
};
