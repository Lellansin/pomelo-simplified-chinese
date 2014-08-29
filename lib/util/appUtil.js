var async = require('async');
var log = require('./log');
var utils = require('./utils');
var path = require('path');
var fs = require('fs');
var Constants = require('./constants');
var starter = require('../master/starter');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

/**
 * 初始化应用程序的配置
 */
module.exports.defaultConfiguration = function(app) {
  var args = parseArgs(process.argv);
  setupEnv(app, args);
  loadMaster(app);
  loadServers(app);
  processArgs(app, args);
  configLogger(app);
  loadLifecycle(app);
};

/**
 * 根据类型开启服务器
 */
module.exports.startByType = function(app, cb) {
  // startId 默认不存在，在产生子进程之后开始有
  if(!!app.startId) {
    if(app.startId === Constants.RESERVED.MASTER) {
      utils.invokeCallback(cb);
    } else {
      starter.runServers(app);
    }
  } else {
    if(!!app.type && app.type !== Constants.RESERVED.ALL && app.type !== Constants.RESERVED.MASTER) {
      starter.runServers(app);
    } else {
      utils.invokeCallback(cb);
    }
  }
};

/**
 * 让 app 加载默认组件
 */
module.exports.loadDefaultComponents = function(app) {
  var pomelo = require('../pomelo');
  // 加载系统默认组件
  if (app.serverType === Constants.RESERVED.MASTER) {
    app.load(pomelo.master, app.get('masterConfig'));
  } else {
    app.load(pomelo.proxy, app.get('proxyConfig'));
    if (app.getCurServer().port) {
      app.load(pomelo.remote, app.get('remoteConfig'));
    }
    if (app.isFrontend()) {
      app.load(pomelo.connection, app.get('connectionConfig'));
      app.load(pomelo.connector, app.get('connectorConfig'));
      app.load(pomelo.session, app.get('sessionConfig'));
      // 兼容 schedulerConfig
      if(app.get('schedulerConfig')) {
        app.load(pomelo.pushScheduler, app.get('schedulerConfig'));
      } else {
        app.load(pomelo.pushScheduler, app.get('pushSchedulerConfig'));
      }
    }
    app.load(pomelo.backendSession, app.get('backendSessionConfig'));
    app.load(pomelo.channel, app.get('channelConfig'));
    app.load(pomelo.server, app.get('serverConfig'));
  }
  app.load(pomelo.monitor, app.get('monitorConfig'));
};

/**
 * 停止组件们 (递归函数)
 *
 * @param  {Array}  comps 组件列表
 * @param  {Number}   index 当前组件索引
 * @param  {Boolean}  force 是否立即停止组件
 * @param  {Function} cb
 */
module.exports.stopComps = function(comps, index, force, cb) {
  if (index >= comps.length) {
    utils.invokeCallback(cb);
    return;
  }
  var comp = comps[index];
  if (typeof comp.stop === 'function') {
    comp.stop(force, function() {
      // 忽略所有报错
      module.exports.stopComps(comps, index + 1, force, cb);
    });
  } else {
    module.exports.stopComps(comps, index + 1, force, cb);
  }
};

/**
 * 应用命令到已加载的组件
 * 该方法将按顺序调用 component {method}
 * 任意 component {method} 返回 err, 它就会直接返回 err 
 *
 * @param {Array} comps 已加载的组件列表
 * @param {String} method 组件生命周期方法名称, 例如: start, stop
 * @param {Function} cb
 */
module.exports.optComponents = function(comps, method, cb) {
  var i = 0;
  async.forEachSeries(comps, function(comp, done) {
    i++;
    if (typeof comp[method] === 'function') {
      comp[method](done);
    } else {
      done();
    }
  }, function(err) {
    if (err) {
      if(typeof err !== 'string') {
        err = err.stack;
      }
      logger.error('fail to operate component, method: %s, err: %j',  method, err.stack);
    }
    utils.invokeCallback(cb, err);
  });
};

/**
 * 加载服务器信息 from config/servers.json.
 */
var loadServers = function(app) {
  app.loadConfigBaseApp(Constants.RESERVED.SERVERS, Constants.FILEPATH.SERVER);
  var servers = app.get(Constants.RESERVED.SERVERS);
  var serverMap = {}, slist, i, l, server;
  for (var serverType in servers) {
    slist = servers[serverType];
    for (i = 0, l = slist.length; i < l; i++) {
      server = slist[i];
      server.serverType = serverType;
      if(server[Constants.RESERVED.CLUSTER_COUNT]) {
        utils.loadCluster(app, server, serverMap);
        continue;
      }
      serverMap[server.id] = server;
      if (server.wsPort) {
        logger.warn('wsPort is deprecated, use clientPort in frontend server instead, server: %j', server);
      }
    }
  }
  app.set(Constants.KEYWORDS.SERVER_MAP, serverMap);
};

/**
 * 加载 master 服务器信息 from config/master.json.
 */
var loadMaster = function(app) {
  app.loadConfigBaseApp(Constants.RESERVED.MASTER, Constants.FILEPATH.MASTER);
  app.master = app.get(Constants.RESERVED.MASTER);
};

/**
 * 处理服务器开启命令
 */
var processArgs = function(app, args) {
  var serverType = args.serverType || Constants.RESERVED.MASTER;
  var serverId = args.id || app.getMaster().id;
  var mode = args.mode || Constants.RESERVED.CLUSTER;
  var masterha = args.masterha || 'false';
  var type = args.type || Constants.RESERVED.ALL;
  var startId = args.startId;

  app.set(Constants.RESERVED.MAIN, args.main, true);
  app.set(Constants.RESERVED.SERVER_TYPE, serverType, true);
  app.set(Constants.RESERVED.SERVER_ID, serverId, true);
  app.set(Constants.RESERVED.MODE, mode, true);
  app.set(Constants.RESERVED.TYPE, type, true);
  if(!!startId) {
    app.set(Constants.RESERVED.STARTID, startId, true);
  }
  
  if (serverType !== Constants.RESERVED.MASTER) {
    app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
  } else {
    app.set(Constants.RESERVED.CURRENT_SERVER, app.getMaster(), true);
  }

  if (masterha === 'true') {
    app.master = args;
    app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
  }
};

/**
 * 设置环境变量
 */
var setupEnv = function(app, args) {
  app.set(Constants.RESERVED.ENV, args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV, true);
};

/**
 * 配置自定义日志服务
 */
var configLogger = function(app) {
  if (process.env.POMELO_LOGGER !== 'off') {
    var env = app.get(Constants.RESERVED.ENV);
    var originPath = path.join(app.getBase(), Constants.FILEPATH.LOG);
    var presentPath = path.join(app.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
    if(fs.existsSync(originPath)) {
      log.configure(app, originPath);
    } else if(fs.existsSync(presentPath)) {
      log.configure(app, presentPath);
    } else {
      logger.error('logger file path configuration is error.');
    }
  }
};

/**
 * Parse command line arguments.
 * 解析命令行参数
 *
 * @param args command line arguments
 *
 * @return Object argsMap map of arguments
 */
var parseArgs = function(args) {
  var argsMap = {};
  var mainPos = 1;

  while (args[mainPos].indexOf('--') > 0) {
    mainPos++;
  }
  argsMap.main = args[mainPos];

  for (var i = (mainPos + 1); i < args.length; i++) {
    var arg = args[i];
    var sep = arg.indexOf('=');
    var key = arg.slice(0, sep);
    var value = arg.slice(sep + 1);
    if (!isNaN(parseInt(value, 10)) && (value.indexOf('.') < 0)) {
      value = parseInt(value, 10);
    }
    argsMap[key] = value;
  }
  
  return argsMap;
};

/**
 * 加载生命周期文件
 *
 */
var loadLifecycle = function(app) {
  var filePath = path.join(app.getBase(), Constants.FILEPATH.SERVER_DIR, app.serverType, Constants.FILEPATH.LIFECYCLE);
  if(!fs.existsSync(filePath)) {
    return;
  }
  var lifecycle = require(filePath);
  for(var key in lifecycle) {
    if(typeof lifecycle[key] === 'function') {
      app.lifecycleCbs[key] = lifecycle[key];
    } else {
      logger.warn('lifecycle.js in %s is error format.', filePath);
    }
  }
};
