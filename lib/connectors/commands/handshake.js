var pomelo = require('../../pomelo');
var Package = require('pomelo-protocol').Package;

var CODE_OK = 200;
var CODE_USE_ERROR = 500;
var CODE_OLD_CLIENT = 501;

/**
 * 处理握手 (handshake) 请求.
 *
 * @param {Object} opts 选项参数
 *                      opts.handshake(msg, cb(err, resp)) 握手回调函数. msg 是来自客户端的握手信息
 *                      opts.hearbeat 心跳间隔时间 (level?)
 *                      opts.version required client level
 */
var Command = function(opts) {
  opts = opts || {};
  this.userHandshake = opts.handshake;

  if(opts.heartbeat) {
    this.heartbeatSec = opts.heartbeat;
    this.heartbeat = opts.heartbeat * 1000;
  }

  this.checkClient = opts.checkClient;

  this.useDict = opts.useDict; // 字典使用见 https://github.com/NetEase/pomelo/wiki/%E8%AF%95%E8%AF%95route%E5%8E%8B%E7%BC%A9
  this.useProtobuf = opts.useProtobuf; // 见 https://github.com/NetEase/pomelo/wiki/Protobuf%E5%8E%8B%E7%BC%A9
  this.useCrypto = opts.useCrypto;
};

module.exports = Command;

// 处理握手
Command.prototype.handle = function(socket, msg) {
  if(typeof this.checkClient === 'function') {
    if(!msg || !msg.sys || !this.checkClient(msg.sys.type, msg.sys.version)) {
      processError(socket, CODE_OLD_CLIENT);
      return;
    }
  }

  var opts = {
    heartbeat : setupHeartbeat(this)
  };

  if(this.useDict) {
    var dictVersion = pomelo.app.components.__dictionary__.getVersion();
    if(!msg.sys.dictVersion || msg.sys.dictVersion !== dictVersion){
      opts.dict = pomelo.app.components.__dictionary__.getDict();
      opts.dict.version = dictVersion;
    }
  }

  if(this.useProtobuf) {
    var protoVersion = pomelo.app.components.__protobuf__.getVersion();
    if(!msg.sys.protoVersion || msg.sys.protoVersion < protoVersion){
      opts.protos = pomelo.app.components.__protobuf__.getProtos();
    }
    opts.useProto = true;
  }

  if(!!pomelo.app.components.__decodeIO__protobuf__) {
    if(!!this.useProtobuf) {
      throw new Error('protobuf can not be both used in the same project.');
    }
    var version = pomelo.app.components.__decodeIO__protobuf__.getVersion();
    if(!msg.sys.protoVersion || msg.sys.protoVersion < version) {
      opts.protos = pomelo.app.components.__decodeIO__protobuf__.getProtos();
    }
    opts.useProto = true;
  }

  if(this.useCrypto) {
    pomelo.app.components.__connector__.setPubKey(socket.id, msg.sys.rsa);
  }

  if(typeof this.userHandshake === 'function') {
    this.userHandshake(msg, function(err, resp) {
      if(err) {
        process.nextTick(function() {
          processError(socket, CODE_USE_ERROR);
        });
        return;
      }
      process.nextTick(function() {
        response(socket, opts, resp);
      });
    });
    return;
  }

  process.nextTick(function() {
    response(socket, opts);
  });
};

var setupHeartbeat = function(self) {
  return self.heartbeatSec;
};

var response = function(socket, sys, resp) {
  var res = {
    code: CODE_OK,
    sys: sys
  };
  if(resp) {
    res.user = resp;
  }
  socket.handshakeResponse(Package.encode(Package.TYPE_HANDSHAKE, new Buffer(JSON.stringify(res))));
};

var processError = function(socket, code) {
  var res = {
    code: code
  };
  socket.sendForce(Package.encode(Package.TYPE_HANDSHAKE, new Buffer(JSON.stringify(res))));
  process.nextTick(function() {
    socket.disconnect();
  });
};