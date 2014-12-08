/*!
 * Pomelo -- proto
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */

/**
 * 本模块的依赖项
 */
var utils = require('./util/utils');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var EventEmitter = require('events').EventEmitter;
var events = require('./util/events');
var appUtil = require('./util/appUtil');
var Constants = require('./util/constants');
var appManager = require('./common/manager/appManager');
var fs = require('fs');
var path = require('path');

/**
 * 应用程序原型 (Application prototype)
 *
 * @module
 */
var Application = module.exports = {};

/**
 * 应用程序状态
 */
var STATE_INITED  = 1;  // app 已初始化
var STATE_START   = 2;  // app 启动
var STATE_STARTED = 3;  // app 已启动
var STATE_STOPED  = 4;  // app 已停止

/**
 * 初始化服务器
 *
 *   - 设置默认配置
 */
Application.init = function(opts) {
  opts = opts || {};
  this.loaded = [];       // 加载组件列表
  this.components = {};   // key:名称 -> value:组件 对应
  this.settings = {};     // collection keep set/get
  var base = opts.base || path.dirname(require.main.filename);
  this.set(Constants.RESERVED.BASE, base, true); // 设置应用程序的基准路径(base path)
  this.event = new EventEmitter();  // event object to sub/pub events

  // 当前服务器信息
  this.serverId = null;   // 当前服务器 id
  this.serverType = null; // 当前服务器类型
  this.curServer = null;  // 当前服务器信息
  this.startTime = null;  // 当前服务器启动时间

  // 全局服务器信息
  this.master = null;         // 主服务器信息
  this.servers = {};          // 当前全局服务器信息, id -> info
  this.serverTypeMaps = {};   // 当前全局服务器类型, type -> [info]
  this.serverTypes = [];      // 当前全局服务器类型列表
  this.lifecycleCbs = {};     // 当前服务器自定义生命周期的回调函数
  this.clusterSeq = {};       // 集群id序列 (cluster id seqence)

  // 初始化应用程序的配置
  appUtil.defaultConfiguration(this);

  this.state = STATE_INITED;  // 设置状态为已初始化
  logger.info('application inited: %j', this.getServerId());
};

/**
 * 获取应用程序的基准路径 (base path)
 *
 *  // 在 /home/game/ 目录执行 pomelo start
 *  // 则 app.getBase() 返回 /home/game
 *
 * @return {String} application base path
 *
 * @memberOf Application
 */
Application.getBase = function() {
  return this.get(Constants.RESERVED.BASE);
};

/**
 * 重写应用程序的 require 方法
 *
 * @param {String} relative path of file
 *
 * @memberOf Application
 */
Application.require = function(ph) {
  // 相对应用程序的基准目录来引用 (require) 模块
  // 该 require 可以省去不同地方 require 相同文件使用需要不同路径的麻烦
  return require(path.join(Application.getBase(), ph));
};

/**
 * 配置日志输出器 (通过 {$base}/config/log4js.json 文件)
 * 
 * @param {Object} logger 传入未配置的 pomelo-logger 的实例
 *
 * @memberOf Application
 */
Application.configureLogger = function(logger) {
  if (process.env.POMELO_LOGGER !== 'off') {
    var base = this.getBase();
    var env = this.get(Constants.RESERVED.ENV);
    var originPath = path.join(base, Constants.FILEPATH.LOG);
    var presentPath = path.join(base, Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
    if(fs.existsSync(originPath)) {
      logger.configure(originPath, {serverId: this.serverId, base: base});
    } else if(fs.existsSync(presentPath)) {
      logger.configure(presentPath, {serverId: this.serverId, base: base});
    } else {
      logger.error('logger file path configuration is error.');
    }
  }
};

/**
 * 添加一个过滤器用于前置和后置过滤
 *
 * @param {Object} filter 提供一个前置和后置的过滤方法。
 *                        一个过滤器应该提供两个方法：before 和 after。
 * @memberOf Application
 */
Application.filter = function (filter) {
  this.before(filter);
  this.after(filter);
};

/**
 * 添加前置过滤
 *
 * @param {Object|Function} bf 前置过滤方法, 形似 bf(msg, session, next)
 * @memberOf Application
 */
Application.before = function (bf) {
  addFilter(this, Constants.KEYWORDS.BEFORE_FILTER, bf);
};

/**
 * 添加后置过滤
 *
 * @param {Object|Function} af 后置过滤方法, 形似 `af(err, msg, session, resp, next)`
 * @memberOf Application
 */
Application.after = function (af) {
  addFilter(this, Constants.KEYWORDS.AFTER_FILTER, af);
};

/**
 * 添加一个全局过滤器
 *
 * @param {Object} filter 提供一个前置和后置的过滤方法。
 *                        一个过滤器应该提供两个方法：before 和 after。
 * @memberOf Application
 */
Application.globalFilter = function (filter) {
  this.globalBefore(filter);
  this.globalAfter(filter);
};

/**
 * 添加全局前置过滤
 *
 * @param {Object|Function} bf 前置过滤方法, 形似 bf(msg, session, next)
 * @memberOf Application
 */
Application.globalBefore = function (bf) {
  addFilter(this, Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
};

/**
 * 添加全局后置过滤
 *
 * @param {Object|Function} af 后置过滤方法, 形似 `af(err, msg, session, resp, next)`
 * @memberOf Application
 */
Application.globalAfter = function (af) {
  addFilter(this, Constants.KEYWORDS.GLOBAL_AFTER_FILTER, af);
};

/**
 * 添加 rpc前置过滤
 *
 * @param {Object|Function} bf 前置过滤方法, 形似 bf(msg, session, next)
 * @memberOf Application
 */
Application.rpcBefore = function(bf) {
  addFilter(this, Constants.KEYWORDS.RPC_BEFORE_FILTER, bf);
};

/**
 * 添加 rpc后置过滤
 *
 * @param {Object|Function} af 后置过滤方法, 形似 `af(err, msg, session, resp, next)`
 * @memberOf Application
 */
Application.rpcAfter = function(af) {
  addFilter(this, Constants.KEYWORDS.RPC_AFTER_FILTER, af);
};

/**
 * 添加 rpc过滤器
 *
 * @param {Object} filter 提供一个前置和后置的过滤方法。
 *                        一个过滤器应该提供两个方法：before 和 after。
 * @memberOf Application
 */
Application.rpcFilter = function(filter) {
  this.rpcBefore(filter);
  this.rpcAfter(filter);
};

/**
 * 加载组件
 *
 * @param  {String} name    (可选) 组件名称
 * @param  {Object} component 组件实例，或者能返回该组件实例的方法 (factory function)
 * @param  {[type]} opts    (可选) 传入返回该组件实例的方法 (factory function) 的参数
 * @return {Object}         用于调用的 app 实例 (app instance for chain invoke)
 * @memberOf Application
 */
Application.load = function(name, component, opts) {
  if(typeof name !== 'string') {
    opts = component;
    component = name;
    name = null;
    if(typeof component.name === 'string') {
      name = component.name;
    }
  }

  if(typeof component === 'function') {
    component = component(this, opts);
  }

  if(!name && typeof component.name === 'string') {
    name = component.name;
  }

  if(name && this.components[name]) {
    // 忽略重名组件
    logger.warn('ignore duplicate component: %j', name);
    return;
  }

  this.loaded.push(component);
  if(name) {
    // 有名字的组件就可以通过 app.components[组件名] 获得
    this.components[name] = component;
  }

  return this;
};

/**
 * 加载 json配置文件 this.settings (支持不同环境目录且兼容旧的路径)
 *
 * @param {String} key 设置(environment)的 key
 * @param {String} val 设置(environment)的 value
 * @return {Server|Mixed} 用于连接(chaining), 或者设置 value
 * @memberOf Application
 *
 * 例如： util/appUtil.js 的 loadServers 中调用：
 * app.loadConfigBaseApp('servers', '/config/servers.json');
 */
Application.loadConfigBaseApp = function (key, val) {
  var env = this.get(Constants.RESERVED.ENV);

  // 当前项目目录/config/servers.json
  var originPath = path.join(Application.getBase(), val);

  // 当前项目目录/config/env/servers.json
  var presentPath = path.join(Application.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(val));

  // 找到这个配置文件，然后require，然后设置到 this.setting 中
  if(fs.existsSync(originPath)) {
     var file = require(originPath);
     if (file[env]) {
       file = file[env];
     }
     this.set(key, file);
  } else if(fs.existsSync(presentPath)) {
    var pfile = require(presentPath);
    this.set(key, pfile);
  } else {
    logger.error('invalid configuration with file path: %s', key);
  }
};

/**
 * 加载 json配置文件到 this.settings
 *
 * @param {String} key environment key
 * @param {String} val environment value
 * @return {Server|Mixed} for chaining, or the setting value
 * @memberOf Application
 */
Application.loadConfig = function(key, val) {
  var env = this.get(Constants.RESERVED.ENV);
  val = require(val);
  if (val[env]) {
    val = val[env];
  }
  this.set(key, val);
};

/**
 * 为特定的服务器类型设置路由方法
 *
 * Examples:
 *
 *  app.route('area', routeFunc);
 *
 *  var routeFunc = function(session, msg, app, cb) {
 *    // 所有对于 'area' 的请求 将被 分配到第一个 area 服务器
 *    var areas = app.getServersByType('area');
 *    cb(null, areas[0].id);
 *  };
 *
 * @param  {String} serverType 服务器类型名称
 * @param  {Function} routeFunc  处理路由的回调函数. 形如：routeFunc(session, msg, app, cb)
 * @return {Object}   当前 application 实例 for chain invoking
 * @memberOf Application
 */
Application.route = function(serverType, routeFunc) {
  var routes = this.get(Constants.KEYWORDS.ROUTE);
  if(!routes) {
    routes = {};
    this.set(Constants.KEYWORDS.ROUTE, routes);
  }
  routes[serverType] = routeFunc;
  return this;
};

/**
 * 设置服务器停止的前置回调函数. 将在服务器停止之前执行。
 *
 * @param  {Function} fun 回调函数
 * @return {Void}
 * @memberOf Application
 *
 * 注：该函数在 pomelo 0.8 中被废弃
 */
Application.beforeStopHook = function(fun) {
  logger.warn('this method was deprecated in pomelo 0.8');
  if(!!fun && typeof fun === 'function') {
    this.set(Constants.KEYWORDS.BEFORE_STOP_HOOK, fun);
  }
};

/**
 * 开始应用程序. 将会加载默认组件然后开启所有已加载的组件。
 *
 * @param  {Function} cb callback function
 * @memberOf Application
 */
 Application.start = function(cb) {
  // 设置服务器启动时间
  this.startTime = Date.now();
  // 如果当前服务器状态不是已初始化 `inited` 则报错
  if(this.state > STATE_INITED) {
    utils.invokeCallback(cb, new Error('application has already start.'));
    return;
  }
  
  var self = this;
  // 按照类型依次启动各个服务器
  appUtil.startByType(self, function() {
    // 加载默认组件
    appUtil.loadDefaultComponents(self);

    // 启动的前置回调函数
    var startUp = function() {
      // 依次调用当前 app.loaded 中所有组件的"启动"函数
      appUtil.optComponents(self.loaded, Constants.RESERVED.START, function(err) {
        self.state = STATE_START;
        if(err) {
          utils.invokeCallback(cb, err);
        } else {
          logger.info('%j enter after start...', self.getServerId());
          self.afterStart(cb);
        }
      });
    };

    // 如果有设置启动时的回调函数，则把 startUp 传入其中执行，否则直接执行 startUp
    var beforeFun = self.lifecycleCbs[Constants.LIFECYCLE.BEFORE_STARTUP];
    if(!!beforeFun) {
      beforeFun.call(null, self, startUp);
    } else {
      startUp();
    }
  });
};

/**
 * 启动后执行的生命周期回调函数
 *
 * @param  {Function} cb callback function
 * @return {Void}
 */
Application.afterStart = function(cb) {
  if(this.state !== STATE_START) {
    utils.invokeCallback(cb, new Error('application is not running now.'));
    return;
  }

  var afterFun = this.lifecycleCbs[Constants.LIFECYCLE.AFTER_STARTUP];
  var self = this;
  // 依次调用当前 app.loaded 中所有组件的"启动后"函数
  appUtil.optComponents(this.loaded, Constants.RESERVED.AFTER_START, function(err) {
    self.state = STATE_STARTED;
    var id = self.getServerId();
    if(!err) {
      logger.info('%j finish start', id);
    }
    // 如果生命周期中设置了 afterStart 时的回调函数，则调用
    if(!!afterFun) {
      afterFun.call(null, self, function() {
        utils.invokeCallback(cb, err);
      });
    } else {
      utils.invokeCallback(cb, err);
    }
    // 打印启动耗时
    var usedTime = Date.now() - self.startTime;
    logger.info('%j startup in %s ms', id, usedTime);
    // 触发 'start_server' 事件
    self.event.emit(events.START_SERVER, id);
  });
};

/**
 * 停止组件
 *
 * @param  {Boolean} force 是否马上停止 app
 */
Application.stop = function(force) {
  if(this.state > STATE_STARTED) {
    logger.warn('[pomelo application] application is not running now.');
    return;
  }
  this.state = STATE_STOPED;
  var self = this;
  
  // 3s 之后执行 exit 终止进程
  this.stopTimer = setTimeout(function() {
    process.exit(0);
  }, Constants.TIME.TIME_WAIT_STOP); // 3 * 1000

  // 关闭前的前置回调函数
  var shutDown = function() {
    appUtil.stopComps(self.loaded, 0, force, function() {
      if(!!self.stopTimer) {
        clearTimeout(self.stopTimer);
      }
      if(force) {
        process.exit(0);
      }
    });
  };
  var fun = this.get(Constants.KEYWORDS.BEFORE_STOP_HOOK);
  var stopFun = this.lifecycleCbs[Constants.LIFECYCLE.BEFORE_SHUTDOWN];
  if(!!stopFun) {
    stopFun.call(null, this, shutDown);
  } else if(!!fun) {
    utils.invokeCallback(fun, self, shutDown);
  } else {
    shutDown();
  }
};

/**
 * 给设置项赋值, 或者返回设置项的值
 *
 * Example:
 *
 *  app.set('key1', 'value1');
 *  app.get('key1');  // 'value1'
 *  app.key1;         // undefined
 *
 *  app.set('key2', 'value2', true);
 *  app.get('key2');  // 'value2'
 *  app.key2;         // 'value2'
 *
 * @param {String} setting 应用程序的设置项名称
 * @param {String} val 该项的值
 * @param {Boolean} attach 是否附加到应用程序实例上
 * @return {Server|Mixed} for chaining, or the setting value
 * @memberOf Application
 */
Application.set = function (setting, val, attach) {
  if (arguments.length === 1) {
    return this.settings[setting];
  }
  this.settings[setting] = val;
  if(attach) {
    this[setting] = val;
  }
  return this;
};

/**
 * 获取 setting 中的属性(property)
 *
 * @param {String} setting 应用程序设置项 (application setting) 的名称
 * @return {String} val
 * @memberOf Application
 */
Application.get = function (setting) {
  return this.settings[setting];
};

/**
 * 检查 `setting` 项是否已启用
 *
 * @param {String} setting 应用程序设置项名称
 * @return {Boolean}
 * @memberOf Application
 */
Application.enabled = function (setting) {
  return !!this.get(setting);
};

/**
 * 检查 `setting` 项是否已失效
 *
 * @param {String} setting 应用程序设置项名称
 * @return {Boolean}
 * @memberOf Application
 */
Application.disabled = function (setting) {
  return !this.get(setting);
};

/**
 * 启用 `setting`项 (将其值设置为 true)
 *
 * @param {String} setting 设置项名称
 * @return {app} for chaining
 * @memberOf Application
 */
Application.enable = function (setting) {
  return this.set(setting, true);
};

/**
 * 关闭 `setting`项 (将其值设置为 false)
 *
 * @param {String} setting 设置项名称
 * @return {app} for chaining
 * @memberOf Application
 */
Application.disable = function (setting) {
  return this.set(setting, false);
};

/**
 * 配置回调函数 用于 特定环境 (env) 和服务器类型
 * 当没有指定 env 时回调函数将会被所有环境调用
 * 当没有指定类型时回调函数背会所有服务器类型调用
 *
 * Examples:
 *
 *  app.configure(function(){
 *    // 所有环境和所有服务器类型都执行
 *  });
 *
 *  app.configure('development', function(){
 *    // 仅 'development' 环境下执行 
 *  });
 *
 *  app.configure('development', 'connector', function(){
 *    // 仅 'development' 环境下的 'connector' 类型服务器执行
 *  });
 *
 * @param {String} env app的环境
 * @param {Function} fn 回调函数
 * @param {String} type 服务器类型
 * @return {Application} for chaining
 * @memberOf Application
 */
Application.configure = function (env, type, fn) {
  var args = [].slice.call(arguments);
  fn = args.pop();
  env = type = Constants.RESERVED.ALL;

  if(args.length > 0) {
    env = args[0];
  }
  if(args.length > 1) {
    type = args[1];
  }

  if (env === Constants.RESERVED.ALL || contains(this.settings.env, env)) {
    if (type === Constants.RESERVED.ALL || contains(this.settings.serverType, type)) {
      fn.call(this);
    }
  }
  return this;
};

/**
 * 注册管理员模块 (admin modules). 管理员模块是监控系统的拓展点.
 *
 * @param {String} module (可选) module id or provoided by module.moduleId
 * @param {Object} module module object or factory function for module
 * @param {Object} opts construct parameter for module
 * @memberOf Application
 */
Application.registerAdmin = function(moduleId, module, opts) {
  var modules = this.get(Constants.KEYWORDS.MODULE);
  if(!modules) {
    modules = {};
    this.set(Constants.KEYWORDS.MODULE, modules);
  }

  if(typeof moduleId !== 'string') {
    opts = module;
    module = moduleId;
    if(module) {
      moduleId = module.moduleId;
    }
  }

  if(!moduleId){
    return;
  }

  modules[moduleId] = {
    moduleId: moduleId,
    module: module,
    opts: opts
  };
};

/**
 * 使用插件
 *
 * @param  {Object} plugin 插件实例
 * @param  {[type]} opts   (可选) 传给插件的构造参数
 * @memberOf Application
 *
 * 调用实例见 https://github.com/NetEase/lordofpomelo/blob/62c0d2987482e59d500887f01ec1568d669f794a/game-server/app.js#L63
 * 插件实例见 https://github.com/search?utf8=%E2%9C%93&q=pomelo+plugin&type=Repositories&ref=searchresults
 */
Application.use = function(plugin, opts) {
  if(!plugin.components) {
    logger.error('invalid components, no components exist');
    return;
  }

  var self = this;
  opts = opts || {};
  var dir = path.dirname(plugin.components);

  if(!fs.existsSync(plugin.components)) {
    logger.error('fail to find components, find path: %s', plugin.components);
    return;
  }

  fs.readdirSync(plugin.components).forEach(function (filename) {
    if (!/\.js$/.test(filename)) {
      return;
    }
    var name = path.basename(filename, '.js');
    var param = opts[name] || {};
    var absolutePath = path.join(dir, Constants.DIR.COMPONENT, filename);
    if(!fs.existsSync(absolutePath)) {
      logger.error('component %s not exist at %s', name, absolutePath);
    } else {
      self.load(require(absolutePath), param);
    }
  });

  // 加载事件
  if(!plugin.events) {
    return;
  } else {
    if(!fs.existsSync(plugin.events)) {
      logger.error('fail to find events, find path: %s', plugin.events);
      return;
    }

    fs.readdirSync(plugin.events).forEach(function (filename) {
      if (!/\.js$/.test(filename)) {
        return;
      }
      var absolutePath = path.join(dir, Constants.DIR.EVENT, filename);
      if(!fs.existsSync(absolutePath)) {
        logger.error('events %s not exist at %s', filename, absolutePath);
      } else {
        bindEvents(require(absolutePath), self);
      }
    });
  }
};

/**
 * 应用程序事务 (transaction).事务包括条件(conditions)和协议(handlers),如果条件满足, 就会被执行
 * And 你可以设置协议的重试次数。该事务行为日志存储在 logs/transaction.log 中
 *
 * @param {String} name 事务名称
 * @param {Object} conditions 事务开启之前调用的函数
 * @param {Object} handlers 事务过程中调用的函数
 * @param {Number} retry retry times to execute handlers if conditions are successfully executed
 * @memberOf Application
 */
Application.transaction = function(name, conditions, handlers, retry) {
  appManager.transaction(name, conditions, handlers, retry);
};

/**
 * 获取 master 服务器信息
 *
 * @return {Object} master 服务器信息, 形如：{id, host, port}
 * @memberOf Application
 */
Application.getMaster = function() {
  return this.master;
};

/**
 * 获取当前服务器信息
 *
 * @return {Object} current 服务器信息, 形如：{id, serverType, host, port}
 * @memberOf Application
 */
Application.getCurServer = function() {
  return this.curServer;
};

/**
 * 获取当前服务器 id
 *
 * @return {String|Number} 当前服务器 id (从servers.json获取)
 * @memberOf Application
 */
Application.getServerId = function() {
  return this.serverId;
};

/**
 * 获取当前服务器类型
 *
 * @return {String|Number} 当前服务器类型 (从servers.json获取)
 * @memberOf Application
 */
Application.getServerType = function() {
  return this.serverType;
};

/**
 * 获取当前服务器的所有信息
 *
 * @return {Object} server info map, key: server id, value: server info
 * @memberOf Application
 */
Application.getServers = function() {
  return this.servers;
};

/**
 * 获取所有服务器信息（从 servers.json）
 *
 * @return {Object} server info map, key: server id, value: server info
 * @memberOf Application
 */
Application.getServersFromConfig = function() {
  return this.get(Constants.KEYWORDS.SERVER_MAP);
};

/**
 * 获取所有服务器类型
 *
 * @return {Array} server 类型列表
 * @memberOf Application
 */
Application.getServerTypes = function() {
  return this.serverTypes;
};

/**
 * 获取服务器信息。（根据服务器id，从当前服务器cluster获取）
 *
 * @param  {String} serverId 服务器 id
 * @return {Object} 服务器 info or undefined
 * @memberOf Application
 */
Application.getServerById = function(serverId) {
  return this.servers[serverId];
};

/**
 * 获取服务器信息。（根据服务器id，从servers.json中获取）
 *
 * @param  {String} serverId 服务器 id
 * @return {Object} server info or undefined
 * @memberOf Application
 */

Application.getServerFromConfig = function(serverId) {
  return this.get(Constants.KEYWORDS.SERVER_MAP)[serverId];
};

/**
 * 获取通过服务器类型获取服务器信息
 *
 * @param  {String} serverType server type
 * @return {Array}      server info list
 * @memberOf Application
 */
Application.getServersByType = function(serverType) {
  return this.serverTypeMaps[serverType];
};

/**
 * 判断服务器是否为前端服务器
 *
 * @param  {server}  server 服务器信息json对象。
 *            如果没有指定，会自动判断当前服务器。
 * @return {Boolean}
 *
 * @memberOf Application
 */
Application.isFrontend = function(server) {
  server = server || this.getCurServer();
  return !!server && server.frontend === 'true';
};

/**
 * 判断服务器是否为后端服务器
 *
 * @param  {server}  server 服务器信息json对象。
 *            如果没有指定，会自动判断当前服务器。
 * @return {Boolean}
 * @memberOf Application
 */
Application.isBackend = function(server) {
  server = server || this.getCurServer();
  return !!server && !server.frontend;
};

/**
 * 判断当前服务器是否为 master 服务器
 *
 * @return {Boolean}
 * @memberOf Application
 */
Application.isMaster = function() {
  return this.serverType === Constants.RESERVED.MASTER;
};

/**
 * 添加一个新的服务器信息 (运行时对当前应用程序)
 *
 * @param {Array} servers new server info list
 * @memberOf Application
 */
Application.addServers = function(servers) {
  if(!servers || !servers.length) {
    return;
  }

  var item, slist;
  for(var i=0, l=servers.length; i<l; i++) {
    item = servers[i];
    // 更新全局服务器 map
    this.servers[item.id] = item;

    // 更新全局服务器 type map
    slist = this.serverTypeMaps[item.serverType];
    if(!slist) {
      this.serverTypeMaps[item.serverType] = slist = [];
    }
    replaceServer(slist, item);

    // 更新全局服务器 type list
    if(this.serverTypes.indexOf(item.serverType) < 0) {
      this.serverTypes.push(item.serverType);
    }
  }
  this.event.emit(events.ADD_SERVERS, servers);
};

/**
 * 运行时从当前应用程序中移除服务器信息
 *
 * @param  {Array} ids server id list
 * @memberOf Application
 */
Application.removeServers = function(ids) {
  if(!ids || !ids.length) {
    return;
  }

  var id, item, slist;
  for(var i=0, l=ids.length; i<l; i++) {
    id = ids[i];
    item = this.servers[id];
    if(!item) {
      continue;
    }
    // clean global server map
    delete this.servers[id];

    // clean global server type map
    slist = this.serverTypeMaps[item.serverType];
    removeServer(slist, id);
    // TODO: should remove the server type if the slist is empty?
  }
  this.event.emit(events.REMOVE_SERVERS, ids);
};

/**
 * 替换服务器信息 from current application at runtime.
 *
 * @param  {Object} server id map
 * @memberOf Application
 */
Application.replaceServers = function(servers) {
  if(!servers){
    return;
  }

  this.servers = servers;
  this.serverTypeMaps = {};
  this.serverTypes = [];
  var serverArray = [];
  for(var id in servers){
    var server = servers[id];
    var serverType = server[Constants.RESERVED.SERVER_TYPE];
    var slist = this.serverTypeMaps[serverType];
    if(!slist) {
      this.serverTypeMaps[serverType] = slist = [];
    }
    this.serverTypeMaps[serverType].push(server);
    // update global server type list
    if(this.serverTypes.indexOf(serverType) < 0) {
      this.serverTypes.push(serverType);
    }
    serverArray.push(server);
  }
  this.event.emit(events.REPLACE_SERVERS, serverArray);
};

/**
 * 添加定时脚本 from current application at runtime.
 *
 * @param  {Array} crons new crons would be added in application
 * @memberOf Application
 */
Application.addCrons = function(crons) {
  if(!crons || !crons.length) {
    logger.warn('crons is not defined.');
    return;
  }
  this.event.emit(events.ADD_CRONS, crons);
};

/**
 * 移除定时脚本 from current application at runtime.
 *
 * @param  {Array} crons old crons would be removed in application
 * @memberOf Application
 */
Application.removeCrons = function(crons) {
  if(!crons || !crons.length) {
    logger.warn('ids is not defined.');
    return;
  }
  this.event.emit(events.REMOVE_CRONS, crons);
};

var replaceServer = function(slist, serverInfo) {
  for(var i=0, l=slist.length; i<l; i++) {
    if(slist[i].id === serverInfo.id) {
      slist[i] = serverInfo;
      return;
    }
  }
  slist.push(serverInfo);
};

var removeServer = function(slist, id) {
  if(!slist || !slist.length) {
    return;
  }

  for(var i=0, l=slist.length; i<l; i++) {
    if(slist[i].id === id) {
      slist.splice(i, 1);
      return;
    }
  }
};

var contains = function(str, settings) {
  if(!settings) {
    return false;
  }

  var ts = settings.split("|");
  for(var i=0, l=ts.length; i<l; i++) {
    if(str === ts[i]) {
      return true;
    }
  }
  return false;
};

var bindEvents = function(Event, app) {
  var emethods = new Event(app);
  for(var m in emethods) {
    if(typeof emethods[m] === 'function') {
      app.event.on(m, emethods[m].bind(emethods));
    }
  }
};

var addFilter = function(app, type, filter) {
 var filters = app.get(type);
  if(!filters) {
    filters = [];
    app.set(type, filters);
  }
  filters.push(filter);
};