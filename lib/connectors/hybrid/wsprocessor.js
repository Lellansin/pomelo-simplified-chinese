var HttpServer = require('http').Server;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var WebSocketServer = require('ws').Server;

var ST_STARTED = 1;
var ST_CLOSED = 2;

/**
 * websocket 协议处理器
 */
var Processor = function() {
  EventEmitter.call(this);
  this.httpServer = new HttpServer();

  var self = this;
  this.wsServer = new WebSocketServer({server: this.httpServer});

  this.wsServer.on('connection', function(socket) {
    // 将被转发到由 Switcher.newSocket 处理
    self.emit('connection', socket);
  });

  this.state = ST_STARTED;
};
util.inherits(Processor, EventEmitter);

module.exports = Processor;

// 新进连接处理
Processor.prototype.add = function(socket, data) {
  if(this.state !== ST_STARTED) {
    return;
  }
  this.httpServer.emit('connection', socket);
  if(typeof socket.ondata === 'function') {
    // 兼容 stream2
    socket.ondata(data, 0, data.length);
  } else {
    // 兼容旧的 stream
    socket.emit('data', data);
  }
};

// 关闭处理器
Processor.prototype.close = function() {
  if(this.state !== ST_STARTED) {
    return;
  }
  this.state = ST_CLOSED;
  this.wsServer.close();
  this.wsServer = null;
  this.httpServer = null;
};
