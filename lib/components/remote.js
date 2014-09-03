/**
 * 组件用于远程服务
 * 加载远程服务并添加到全局上下文中
 */
var fs = require('fs');
var pathUtil = require('../util/pathUtil');
var RemoteServer = require('pomelo-rpc').server;

/**
 * 远程组件工厂函数
 *
 * @param {Object} app  当前 app
 * @param {Object} opts 构造参数
 *                       opts.acceptorFactory {Object}: acceptorFactory.create(opts, cb)
 * @return {Object}     远程组件 instances
 */
module.exports = function(app, opts) {
  opts = opts || {};

  // cacheMsg 字段是废弃的, 此处仅为兼容旧版
  opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
  opts.interval = opts.interval || 30;
  if(app.enabled('rpcDebugLog')) {
    opts.rpcDebugLog = true;
    opts.rpcLogger = require('pomelo-logger').getLogger('rpc-debug', __filename);
  }
  return new Component(app, opts);
};

/**
 * 远程组件类
 *
 * @param {Object} app  当前 app
 * @param {Object} opts 构造参数
 */
var Component = function(app, opts) {
  this.app = app;
  this.opts = opts;
};

var pro = Component.prototype;

pro.name = '__remote__';

/**
 * 远程组件 生命周期函数
 *
 * @param {Function} cb
 * @return {Void}
 */
pro.start = function(cb) {
  this.opts.port = this.app.getCurServer().port;
  this.remote = genRemote(this.app, this.opts);
  this.remote.start();
  process.nextTick(cb);
};

/**
 * 远程组件 生命周期函数
 *
 * @param {Boolean}  force 是否马上停止组件
 * @param {Function}  cb
 * @return {Void}
 */
pro.stop = function(force, cb) {
  this.remote.stop(force);
  process.nextTick(cb);
};

/**
 * 获取远程路径 (通过 app)
 *
 * @param {Object} app 当前 app
 * @return {Array} paths
 *
 */
var getRemotePaths = function(app) {
  var paths = [];

  var role;
  // master 服务器不应该进入此处
  if(app.isFrontend()) {
    role = 'frontend';
  } else {
    role = 'backend';
  }

  var sysPath = pathUtil.getSysRemotePath(role), serverType = app.getServerType();
  if(fs.existsSync(sysPath)) {
    paths.push(pathUtil.remotePathRecord('sys', serverType, sysPath));
  }
  var userPath = pathUtil.getUserRemotePath(app.getBase(), serverType);
  if(fs.existsSync(userPath)) {
    paths.push(pathUtil.remotePathRecord('user', serverType, userPath));
  }

  return paths;
};

/**
 * 生成远程服务器实例
 *
 * @param {Object} app 当前 app
 * @param {Object} opts contructor parameters for rpc Server
 * @return {Object} remote server instance
 */
var genRemote = function(app, opts) {
  opts.paths = getRemotePaths(app);
  opts.context = app;
  if(!!opts.rpcServer) {
    return opts.rpcServer.create(opts);
  } else {
    return RemoteServer.create(opts);
  }
};
