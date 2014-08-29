var util = require('util');
var EventEmitter = require('events').EventEmitter;
var sio = require('socket.io');
var SioSocket = require('./siosocket');

var PKG_ID_BYTES = 4;
var PKG_ROUTE_LENGTH_BYTES = 1;
var PKG_HEAD_BYTES = PKG_ID_BYTES + PKG_ROUTE_LENGTH_BYTES;

var curId = 1;

/**
 * socket.io 连接器 (sio connector)
 * 用于管理服务端和客户端之间底层的连接和协议
 * 开发者也可以编写自己的连接器来处理 (如 tcp 或者 probuf)
 */
var Connector = function(port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);
  this.port = port; // 端口
  this.host = host; // 主机
  this.opts = opts; // 缓存选项
  this.heartbeats = opts.heartbeats || true; // 是否开启心跳
  this.closeTimeout = opts.closeTimeout || 60; // 超时关闭时间
  this.heartbeatTimeout = opts.heartbeatTimeout || 60; // 心跳超时时间
  this.heartbeatInterval = opts.heartbeatInterval || 25; // 心跳间隔
};

util.inherits(Connector, EventEmitter);

module.exports = Connector;

/**
 * 开启连接器, 监听指定端口
 */
Connector.prototype.start = function(cb) {
  var self = this;
  // 问题 https://github.com/NetEase/pomelo-cn/issues/174
  if(!!this.opts) {
    this.wsocket = sio.listen(this.port, this.opts);
  }
  else {
    this.wsocket = sio.listen(this.port, {
      transports: [
      'websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'flashsocket'
      ]
    });
  }
  this.wsocket.set('close timeout', this.closeTimeout); // 超时关闭时间
  this.wsocket.set('heartbeat timeout', this.heartbeatTimeout); // 心跳超时时间
  this.wsocket.set('heartbeat interval', this.heartbeatInterval); // 心跳间隔
  this.wsocket.set('heartbeats', this.heartbeats); // 是否开启心跳
  this.wsocket.set('log level', 1);

  // 定义连接(connection)事件
  this.wsocket.sockets.on('connection', function (socket) {
    // 封装 socket 使其有统一的接口
    var siosocket = new SioSocket(curId++, socket);

    // 触发当前 Connector 的 connection 事件，将该 socket 传入其中
    self.emit('connection', siosocket);

    // 定义 closing 事件 
    siosocket.on('closing', function(reason) {
      siosocket.send({route: 'onKick', reason: reason});
    });
  });

  process.nextTick(cb);
};

/**
 * 停止连接器
 */
Connector.prototype.stop = function(force, cb) {
  this.wsocket.server.close();
  process.nextTick(cb);
};

// 编码
Connector.encode = Connector.prototype.encode = function(reqId, route, msg) {
  if(reqId) {
    return composeResponse(reqId, route, msg);
  } else {
    return composePush(route, msg);
  }
};

/**
 * 解码客户端消息包
 *
 * 包格式:
 *   message id: 4字节 大端 整形
 *   route length: 1字节
 *   route: 路由长度字节 (route length bytes)
 *   body: 其余的字节
 *
 * @param  {String} data 来自客户端的 socket.io 消息包
 * @return {Object}      message object
 */
Connector.decode = Connector.prototype.decode = function(msg) {
  var index = 0;

  var id = parseIntField(msg, index, PKG_ID_BYTES);
  index += PKG_ID_BYTES;

  var routeLen = parseIntField(msg, index, PKG_ROUTE_LENGTH_BYTES);

  var route = msg.substr(PKG_HEAD_BYTES, routeLen);
  var body = msg.substr(PKG_HEAD_BYTES + routeLen);

  return {
    id: id,
    route: route,
    body: JSON.parse(body)
  };
};

var composeResponse = function(msgId, route, msgBody) {
  return {
    id: msgId,
    body: msgBody
  };
};

var composePush = function(route, msgBody) {
  return JSON.stringify({route: route, body: msgBody});
};

var parseIntField = function(str, offset, len) {
  var res = 0;
  for(var i=0; i<len; i++) {
    if(i > 0) {
      res <<= 8;
    }
    res |= str.charCodeAt(offset + i) & 0xff;
  }

  return res;
};