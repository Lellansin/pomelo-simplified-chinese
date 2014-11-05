var protocol = require('pomelo-protocol');
var Package = protocol.Package;
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

var handlers = {};

var ST_INITED = 0;
var ST_WAIT_ACK = 1;
var ST_WORKING = 2;
var ST_CLOSED = 3;

/*
 * 处理初始化握手
 */
var handleHandshake = function(socket, pkg) {
	if(socket.state !== ST_INITED) {
    return;
  }
	socket.emit('handshake', JSON.parse(protocol.strdecode(pkg.body)));
};

/*
 * 处理 TCP 的 ACK 握手
 */
var handleHandshakeAck = function(socket, pkg) {
	if(socket.state !== ST_WAIT_ACK) {
    return;
  }
  socket.state = ST_WORKING;
	socket.emit('heartbeat');
};

/*
 * 处理心跳
 */
var handleHeartbeat = function(socket, pkg) {
	if(socket.state !== ST_WORKING) {
    return;
  }
	socket.emit('heartbeat');
};

/*
 * 处理普通信息
 */
var handleData = function(socket, pkg) {
	if(socket.state !== ST_WORKING) {
    return;
  }
	socket.emit('message', pkg);
};

handlers[Package.TYPE_HANDSHAKE] = handleHandshake;
handlers[Package.TYPE_HANDSHAKE_ACK] = handleHandshakeAck;
handlers[Package.TYPE_HEARTBEAT] = handleHeartbeat;
handlers[Package.TYPE_DATA] = handleData;

/*
 * 根据数据包类型不同触发绑定在 socket 上的不同事件
 */
var handle = function(socket, pkg) {
  var handler = handlers[pkg.type];
  if(!!handler) {
    handler(socket, pkg);
  }	else {
    logger.error('could not find handle invalid data package.');
    socket.disconnect();
  }
};

module.exports = handle;