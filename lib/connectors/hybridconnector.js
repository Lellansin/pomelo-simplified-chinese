var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var HybridSocket = require('./hybridsocket');
var Switcher = require('./hybrid/switcher');
var Handshake = require('./commands/handshake');
var Heartbeat = require('./commands/heartbeat');
var Kick = require('./commands/kick');
var coder = require('./common/coder');
var Tlssocket = require('./hybrid/tlssocket');
var Message = require('pomelo-protocol').Message;
var Constants = require('../util/constants');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

var curId = 1;

/**
 * hybrid Connector 混合连接器
 * 用于管理服务端和客户端之间底层的连接和协议
 * 开发者也可以编写自己的连接器来处理 (如 tcp 或者 probuf)
 */
var Connector = function(port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);

  this.opts = opts || {};
  this.port = port; // 端口
  this.host = host; // 主机
  this.useDict = opts.useDict; // 用于握手
  this.useProtobuf = opts.useProtobuf; // 用于握手

  // 握手
  this.handshake = new Handshake(opts); // opts.handshake(msg, cb(err, resp)) 握手回调函数. msg 是来自客户端的握手信息
                                        // opts.hearbeat 心跳间隔时间 (level?)
                                        // opts.version required client level

  // 心跳
  this.heartbeat = new Heartbeat(opts); // opts.heartbeat 设置心跳间隔
                                        // opts.disconnectOnTimeout 是否超时后端口连接的标志
  
  this.distinctHost = opts.distinctHost; // 是否在不同的主机
  this.ssl = opts.ssl; // 是否设置 ssl

  this.switcher = null;
};

util.inherits(Connector, EventEmitter);

module.exports = Connector;

/**
 * 开启连接器, 监听指定端口
 */
Connector.prototype.start = function(cb) {
  var app = require('../pomelo').app;
  var self = this;

  var gensocket = function(socket) {
    // 封装 socket 使其有统一的接口
    var hybridsocket = new HybridSocket(curId++, socket);
    
    // 绑定 handshake 事件的处理函数为 handshake.handle
    hybridsocket.on('handshake', self.handshake.handle.bind(self.handshake, hybridsocket));

    // 绑定 heartbeat 事件的处理函数为 heartbeat.handle
    hybridsocket.on('heartbeat', self.heartbeat.handle.bind(self.heartbeat, hybridsocket));

    // 绑定 disconnect 事件的处理函数为 heartbeat.clear
    hybridsocket.on('disconnect', self.heartbeat.clear.bind(self.heartbeat, hybridsocket.id));

    // 绑定 closing 事件的处理函数为 Kick.handle
    hybridsocket.on('closing', Kick.handle.bind(null, hybridsocket));

    // 触发 hybrid Connector 的 connection 事件，将该 socket 传入其中
    self.emit('connection', hybridsocket);
  };

  // 如果没有设置 SSL
  if(!this.ssl) {
    // 直接通过内置的 net 模块创建一个 tcp 服务端 (详见 http://nodeapi.ucdok.com/#/api/net.html)
    this.tcpServer = net.createServer();
    this.switcher = new Switcher(this.tcpServer, self.opts);

    // 附加组件到当前 connector
    this.connector = app.components.__connector__.connector;
    this.dictionary = app.components.__dictionary__;
    this.protobuf = app.components.__protobuf__;
    this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;

    this.switcher.on('connection', function(socket) {
      gensocket(socket);
    });

    // 是否在不同的主机(host)上
    if(!!this.distinctHost) {
      this.tcpServer.listen(this.port, this.host);
    } else {
      this.tcpServer.listen(this.port);
    }
  } else {
    // 如果设置了 SSL
    this.tlssocket = new Tlssocket(this.port, this.opts);
    this.tlssocket.on('connection', function(socket) {
      gensocket(socket);
    });
  }
  process.nextTick(cb);
};

// 停止 connector
Connector.prototype.stop = function(force, cb) {
  this.switcher.close();
  this.tcpServer.close();

  process.nextTick(cb);
};

// 解码
Connector.decode = Connector.prototype.decode = coder.decode;
// 编码
Connector.encode = Connector.prototype.encode = coder.encode;