var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mqtt = require('mqtt');
var MQTTSocket = require('./mqttsocket');
var Adaptor = require('./mqtt/mqttadaptor');
var generate = require('./mqtt/generate');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);

var curId = 1;
/**
 * mqtt Connector 连接器
 * 用于管理服务端和客户端之间底层的连接和协议
 * 开发者也可以编写自己的连接器来处理 (如 tcp 或者 probuf)
 */
var Connector = function(port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);
  this.port = port;
  this.host = host;
  opts = opts || {};

  this.adaptor = new Adaptor(opts);
};
util.inherits(Connector, EventEmitter);

module.exports = Connector;
/**
 * Start connector to listen the specified port
 */
Connector.prototype.start = function(cb) {
  var self = this;
  this.mqttServer = mqtt.createServer();
  this.mqttServer.on('client', function(client) {
		client.on('error', function(err) {
			client.stream.destroy();
		});
		client.on('close', function() {
			client.stream.destroy();
		});
		client.on('disconnect', function(packet) {
			client.stream.destroy();
		});
    client.on('connect', function(packet) {
      client.connack({returnCode: 0});
      var mqttsocket = new MQTTSocket(curId++, client, self.adaptor);
      self.emit('connection', mqttsocket);
    });
  });

  this.mqttServer.listen(this.port);

  process.nextTick(cb);
};

Connector.prototype.stop = function() {
	this.mqttServer.close();
	process.exit(0);
};

var composeResponse = function(msgId, route, msgBody) {
  return {
    id: msgId,
    body: msgBody
  };
};

var composePush = function(route, msgBody) {
  var msg = generate.publish(msgBody);
  if(!msg) {
    logger.error('invalid mqtt publish message: %j', msgBody);
  }

  return msg;
};

Connector.prototype.encode = function(reqId, route, msgBody) {
	if (!!reqId) {
		return composeResponse(reqId, route, msgBody);
	} else {
		return composePush(route, msgBody);
	}
};

Connector.prototype.close = function() {
  this.mqttServer.close();
};