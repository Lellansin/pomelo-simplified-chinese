/*!
 * Pomelo
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */

/**
 * 本模块的依赖项目
 */
var fs = require('fs');
var path = require('path');
var application = require('./application');


/**
 * 导出 `createApplication()`.
 *
 * @module
 */

var Pomelo = module.exports = {};

/**
 * 框架版本.
 */

Pomelo.version = '1.0.3';

/**
 * Event 定义（将被 app.event 触发）
 */
Pomelo.events = require('./util/events');

/**
 * 自动加载 组件 (components)
 */
Pomelo.components = {};

/**
 * 自动加载 过滤器 (filters)
 */
Pomelo.filters = {};

/**
 * 自动加载 rpc过滤器
 */
Pomelo.rpcFilters = {};

/**
 * 连接器 (connectors)
 */
Pomelo.connectors = {};
Pomelo.connectors.__defineGetter__('sioconnector', load.bind(null, './connectors/sioconnector'));
Pomelo.connectors.__defineGetter__('hybridconnector', load.bind(null, './connectors/hybridconnector'));
Pomelo.connectors.__defineGetter__('udpconnector', load.bind(null, './connectors/udpconnector'));
Pomelo.connectors.__defineGetter__('mqttconnector', load.bind(null, './connectors/mqttconnector'));

/**
 * 推送计划 (pushSchedulers)
 */
Pomelo.pushSchedulers = {};
Pomelo.pushSchedulers.__defineGetter__('direct', load.bind(null, './pushSchedulers/direct'));
Pomelo.pushSchedulers.__defineGetter__('buffer', load.bind(null, './pushSchedulers/buffer'));

var self = this;

/**
 * 创建一个 pomelo 应用 (application).
 *
 * @return {Application}
 * @memberOf Pomelo
 * @api public
 */
Pomelo.createApp = function (opts) {
  var app = application;
  app.init(opts);
  self.app = app;
  return app;
};

/**
 * 获取 pomelo 应用
 */
Object.defineProperty(Pomelo, 'app', {
  get:function () {
    return self.app;
  }
});

/**
 * 通过 __defineGetter__ 设置 pomelo 内置的组件.
 */
fs.readdirSync(__dirname + '/components').forEach(function (filename) {
  // 检查是否为 js 文件
  if (!/\.js$/.test(filename)) {
    return;
  }

  // 获取文件名
  var name = path.basename(filename, '.js');

  // require pomelo 内置的 componets (位于 lib/componets 目录下)
  var _load = load.bind(null, './components/', name);

  // 将组件设置在 pomelo 上
  Pomelo.components.__defineGetter__(name, _load);
  Pomelo.__defineGetter__(name, _load);
});

// 设置内置的过滤器 (与上方类同)
fs.readdirSync(__dirname + '/filters/handler').forEach(function (filename) {
  if (!/\.js$/.test(filename)) {
    return;
  }
  var name = path.basename(filename, '.js');
  var _load = load.bind(null, './filters/handler/', name);
  
  Pomelo.filters.__defineGetter__(name, _load);
  Pomelo.__defineGetter__(name, _load);
});

// 设置内置的 rpc过滤器 (与上方类同)
fs.readdirSync(__dirname + '/filters/rpc').forEach(function (filename) {
  if (!/\.js$/.test(filename)) {
    return;
  }
  var name = path.basename(filename, '.js');
  var _load = load.bind(null, './filters/rpc/', name);
  
  Pomelo.rpcFilters.__defineGetter__(name, _load);
});

function load(path, name) {
  if (name) {
    return require(path + name);
  }
  return require(path);
}
