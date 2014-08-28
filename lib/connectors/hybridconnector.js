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
 * Connector 连接器
 * 用于管理服务端和客户端之间底层的连接和协议
 * 开发者也可以编写自己的连接器来处理 (如 tcp 或者 probuf)
 */
var Connector = function(port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);

  this.opts = opts || {};
  this.port = port;
  this.host = host;
  this.useDict = opts.useDict;
  this.useProtobuf = opts.useProtobuf;
  this.handshake = new Handshake(opts);
  this.heartbeat = new Heartbeat(opts);
  this.distinctHost = opts.distinctHost;
  this.ssl = opts.ssl;

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
    var hybridsocket = new HybridSocket(curId++, socket);
    hybridsocket.on('handshake', self.handshake.handle.bind(self.handshake, hybridsocket));
    hybridsocket.on('heartbeat', self.heartbeat.handle.bind(self.heartbeat, hybridsocket));
    hybridsocket.on('disconnect', self.heartbeat.clear.bind(self.heartbeat, hybridsocket.id));
    hybridsocket.on('closing', Kick.handle.bind(null, hybridsocket));
    self.emit('connection', hybridsocket);
  };

  // 如果没有开启 SSL
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

    if(!!this.distinctHost) {
      this.tcpServer.listen(this.port, this.host);
    } else {
      this.tcpServer.listen(this.port);
    }
  } else {
    this.tlssocket = new Tlssocket(this.port, this.opts);
    this.tlssocket.on('connection', function(socket) {
      gensocket(socket);
    });
  }
  process.nextTick(cb);
};

Connector.prototype.stop = function(force, cb) {
  this.switcher.close();
  this.tcpServer.close();

  process.nextTick(cb);
};

Connector.decode = Connector.prototype.decode = coder.decode;

Connector.encode = Connector.prototype.encode = coder.encode;