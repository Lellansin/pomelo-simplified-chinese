var util = require('util');
var EventEmitter = require('events').EventEmitter;
var handler = require('./common/handler');
var protocol = require('pomelo-protocol');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var Package = protocol.Package;

var ST_INITED = 0;
var ST_WAIT_ACK = 1;
var ST_WORKING = 2;
var ST_CLOSED = 3;

/**
 * Socket class that wraps socket and websocket to provide unified interface for up level.
 * 封装了 socket 和 websocket 操作，为混合连接器提供一个统一的 socket 操作接口
 */
var Socket = function(id, socket) {
  EventEmitter.call(this);
  this.id = id;
  this.socket = socket;

  if(!socket._socket) {
    this.remoteAddress = {
      ip: socket.address().address,
      port: socket.address().port
    };
  } else {
    this.remoteAddress = {
      ip: socket._socket.remoteAddress,
      port: socket._socket.remotePort
    };
  }

  var self = this;

  // 将传入的 socket 的事件转发给当前封装的类
  socket.once('close', this.emit.bind(this, 'disconnect'));
  socket.on('error', this.emit.bind(this, 'error'));

  // 定义 message 事件
  socket.on('message', function(msg) {
    if(msg) {
      msg = Package.decode(msg);
      handler(self, msg);
    }
  });

  this.state = ST_INITED;

  // TODO: any other events?
};

util.inherits(Socket, EventEmitter);

module.exports = Socket;

/**
 * 发送原始字节数据 (raw byte data)
 *
 * @api private
 */
Socket.prototype.sendRaw = function(msg) {
  if(this.state !== ST_WORKING) {
    return;
  }
  var self = this;

  this.socket.send(msg, {binary: true}, function(err) {
    if(!!err) {
      logger.error('websocket send binary data failed: %j', err.stack);
      return;
    }
  });
};

/**
 * 向客户端发送字节数据包 (byte data package)
 *
 * @param  {Buffer} msg 字节数据
 */
Socket.prototype.send = function(msg) {
  if(msg instanceof String) {
    msg = new Buffer(msg);
  } else if(!(msg instanceof Buffer)) {
    msg = new Buffer(JSON.stringify(msg));
  }
  // 将 msg 通过 Package.encode 编码然后发送给客户端
  this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
};

/**
 * 向客户端批量发送字节数据包
 *
 * @param  {Buffer} msgs 字节数据数组
 */
Socket.prototype.sendBatch = function(msgs) {
  var rs = [];
  for(var i=0; i<msgs.length; i++) {
    var src = Package.encode(Package.TYPE_DATA, msgs[i]);
    rs.push(src);
  }
  this.sendRaw(Buffer.concat(rs));
};

/**
 * 向客户端发送消息，不论是否握手
 *
 * @api private
 */
Socket.prototype.sendForce = function(msg) {
  if(this.state === ST_CLOSED) {
    return;
  }
  this.socket.send(msg, {binary: true});
};

/**
 * 响应握手请求
 *
 * @api private
 */
Socket.prototype.handshakeResponse = function(resp) {
  if(this.state !== ST_INITED) {
    return;
  }

  this.socket.send(resp, {binary: true});
  this.state = ST_WAIT_ACK;
};

/**
 * 关闭连接
 *
 * @api private
 */
Socket.prototype.disconnect = function() {
  if(this.state === ST_CLOSED) {
    return;
  }

  this.state = ST_CLOSED;
  this.socket.emit('close');
  this.socket.close();
};