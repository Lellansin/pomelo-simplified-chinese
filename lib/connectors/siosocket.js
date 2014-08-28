var util = require('util');
var EventEmitter = require('events').EventEmitter;

var ST_INITED = 0;
var ST_CLOSED = 1;

/**
 * Socket class that wraps socket.io socket to provide unified interface for up level.
 * 封装了 socket.io 的 socket 操作，为连接器提供一个统一的 socket 操作接口
 */
var Socket = function(id, socket) {
  EventEmitter.call(this);
  this.id = id;
  this.socket = socket;
  this.remoteAddress = {
    ip: socket.handshake.address.address,
    port: socket.handshake.address.port
  };

  var self = this;

  // 将传入的 socket 的事件转发给当前封装的类
  socket.on('disconnect', this.emit.bind(this, 'disconnect'));
  socket.on('error', this.emit.bind(this, 'error'));

  socket.on('message', function(msg) {
    self.emit('message', msg);
  });

  this.state = ST_INITED;

  // TODO: any other events?
};

util.inherits(Socket, EventEmitter);

module.exports = Socket;

// 发送
Socket.prototype.send = function(msg) {
  if(this.state !== ST_INITED) {
    return;
  }
  if(typeof msg !== 'string') {
    msg = JSON.stringify(msg);
  }
  this.socket.send(msg);
};

// 断开连接
Socket.prototype.disconnect = function() {
  if(this.state === ST_CLOSED) {
    return;
  }

  this.state = ST_CLOSED;
  this.socket.disconnect();
};

// 批量发送
Socket.prototype.sendBatch = function(msgs) {
  this.send(encodeBatch(msgs));
};

/**
 * 编码批量消息
 */
var encodeBatch = function(msgs){
  var res = '[', msg;
  for(var i=0, l=msgs.length; i<l; i++) {
    if(i > 0) {
      res += ',';
    }
    msg = msgs[i];
    if(typeof msg === 'string') {
      res += msg;
    } else {
      res += JSON.stringify(msg);
    }
  }
  res += ']';
  return res;
};
