var Package = require('pomelo-protocol').Package;
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

/**
 * 处理心跳请求
 *
 * @param {Object} opts 请求选项
 *                      opts.heartbeat 心跳间隔
 */
var Command = function(opts) {
  opts = opts || {};
  this.heartbeat = null;
  this.timeout = null;

  if(opts.heartbeat) {
    this.heartbeat = opts.heartbeat * 1000; // 心跳间隔
    this.timeout = opts.timeout * 1000 || this.heartbeat * 2; // 最大心跳消息超时时间
  }

  this.heartbeats = {};
  this.timeouts = {};
  this.clients = {};
  this.disconnectOnTimeout = opts.disconnectOnTimeout; // 是否超时后端口连接的标志
};

module.exports = Command;

Command.prototype.handle = function(socket) {
  if(!this.heartbeat) {
    // 没有设置心跳，直接返回
    return;
  }

  var self = this;

  if(this.heartbeats[socket.id]) {
    // 早已存储该 id 的心跳间隔
    return;
  }

  if(!this.clients[socket.id]) {
    // 当 socket 断线或者报错时，清除计时器
    this.clients[socket.id] = 1;
    socket.once('disconnect', clearTimers.bind(null, this, socket.id));
    socket.once('error', clearTimers.bind(null, this, socket.id));
  }

  if(self.disconnectOnTimeout) {
    this.clear(socket.id);
  }

  // 设置当前连接的心跳
  this.heartbeats[socket.id] = setTimeout(function() {
    socket.sendRaw(Package.encode(Package.TYPE_HEARTBEAT));
    delete self.heartbeats[socket.id];

    if(self.disconnectOnTimeout) {
      // 设置超时计时器 及其回调函数
      self.timeouts[socket.id] = setTimeout(function() {
        logger.info('client %j heartbeat timeout.', socket.id);
        socket.disconnect(); // 断开 socket 连接
      }, self.timeout);
    }
  }, this.heartbeat);
};

// 清除超时计时器
Command.prototype.clear = function(id) {
  var tid = this.timeouts[id];
  if(tid) {
    clearTimeout(tid);
    delete this.timeouts[id];
  }
};

// 清除计时器
var clearTimers = function(self, id) {
  delete self.clients[id];
  var tid = self.timeouts[id];
  if(tid) {
    clearTimeout(tid);
    delete self.timeouts[id];
  }

  tid = self.heartbeats[id];
  if(tid) {
    clearTimeout(tid);
    delete self.heartbeats[id];
  }
};