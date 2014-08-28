var EventEmitter = require('events').EventEmitter;
var util = require('util');
var WSProcessor = require('./wsprocessor');
var TCPProcessor = require('./tcpprocessor');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

// http 协议中的方法
var HTTP_METHODS = [
  'GET', 'POST', 'DELETE', 'PUT', 'HEAD'
];

// 当前状态
var ST_STARTED = 1; // 已开启
var ST_CLOSED = 2; // 已关闭

var DEFAULT_TIMEOUT = 90; // 默认 90s 超时

/**
 * Switcher for tcp and websocket protocol
 * 用于 TCP 和 websocket 协议的切换器
 *
 * @param {Object} server 从内置 net 模块创建的 tcp 服务端实例
 */
var Switcher = function(server, opts) {
  EventEmitter.call(this);
  this.server = server; // 服务器实例
  this.wsprocessor = new WSProcessor(); // websocket 处理器
  this.tcpprocessor = new TCPProcessor(opts.closeMethod); // tcp 处理器
  this.id = 1;
  this.timers = {};
  this.timeout = opts.timeout || DEFAULT_TIMEOUT; // 超时时间
  this.setNoDelay = opts.setNoDelay; // 禁用纳格（Nagle）算法。socket.wirte 时数据直接发送

  // 详细用法可见 http://www.lellansin.com/?p=1907
  this.server.on('connection', this.newSocket.bind(this)); // 指定 socket 服务器连接事件的回调函数为 Switcher.newSocket
  this.wsprocessor.on('connection', this.emit.bind(this, 'connection')); // 将 websocket 处理器的连接事件转发给当前 Switcher 类的 connection 事件
  this.tcpprocessor.on('connection', this.emit.bind(this, 'connection')); // 将 tcp 处理器的连接事件转发给当前 Switcher 类的 connection 事件

  this.state = ST_STARTED;
};
util.inherits(Switcher, EventEmitter);

module.exports = Switcher;

// 处理新连接
Switcher.prototype.newSocket = function(socket) {
  if(this.state !== ST_STARTED) {
    return;
  }

  // 如果设置了连接超时
  if(!!this.timeout) {
    var timer = setTimeout(function() {
      logger.warn('connection is timeout without communication, the remote ip is %s && port is %s', socket.remoteAddress, socket.remotePort);
      socket.destroy();
    }, this.timeout * 1000);

    this.timers[this.id] = timer;
    socket.id = this.id++;
  }

  var self = this;
  socket.once('data', function(data) {
    if(!!socket.id) {
      // 清除上方设置的超时操作
      clearTimeout(self.timers[socket.id]);
      delete self.timers[socket.id];
    }

    // 判断数据是否按 http 协议格式
    if(isHttp(data)) {
      
      // 调用 websocket 处理器来处理发上来的数据
      processHttp(self, self.wsprocessor, socket, data);
    } else {
      if(!!self.setNoDelay) {
        // 默认情况下 TCP 连接使用纳格算法，这些连接在发送数据之前对数据进行缓冲处理。
        // 将 noDelay设成true会在每次 socket.write() 被调用时立刻发送数据。noDelay默认为true。
        socket.setNoDelay(true);
      }

      // 调用 tcp 处理器来处理发上来的数据
      processTcp(self, self.tcpprocessor, socket, data);
    }
  });
};

// 关闭切换器
Switcher.prototype.close = function() {
  if(this.state !== ST_STARTED) {
    return;
  }

  this.state = ST_CLOSED;
  this.wsprocessor.close();
  this.tcpprocessor.close();
};

// 判断是否为 http 连接
var isHttp = function(data) {
  // socket 的 data 事件收到的参数 data 实际上是一个 buffer 对象
  // 这里调用的是 buffer 的 toString 方法，取 socket 发上来的前四个字符
  var head = data.toString('utf8', 0, 4);

  // 比较开头是否为 http 的方法
  for(var i=0, l=HTTP_METHODS.length; i<l; i++) {
    if(head.indexOf(HTTP_METHODS[i]) === 0) {
      return true;
    }
  }

  return false;
};

// 处理 Http 连接
var processHttp = function(switcher, processor, socket, data) {
  processor.add(socket, data);
};

// 处理 Tcp 连接
var processTcp = function(switcher, processor, socket, data) {
  processor.add(socket, data);
};
