/**
 * 连接统计服务
 * 记录连接, 登陆数目和列表
 */
var Service = function(app) {
  this.serverId = app.getServerId();
  this.connCount = 0;
  this.loginedCount = 0;
  this.logined = {};
};

module.exports = Service;

var pro = Service.prototype;


/**
 * 添加已登录的用户
 *
 * @param uid {String} 用户id
 * @param info {Object} 已登录用户的记录
 */
pro.addLoginedUser = function(uid, info) {
  if(!this.logined[uid]) {
    this.loginedCount++;
  }
  info.uid = uid;
  this.logined[uid] = info;
};

/**
 * 增加连接数
 */
pro.increaseConnectionCount = function() {
  this.connCount++;
};

/**
 * 移除已登录的用户
 *
 * @param uid {String} 用户id
 */
pro.removeLoginedUser = function(uid) {
  if(!!this.logined[uid]) {
    this.loginedCount--;
  }
  delete this.logined[uid];
};

/**
 * 减少连接数
 *
 * @param uid {String} uid
 */
pro.decreaseConnectionCount = function(uid) {
  if(this.connCount) {
    this.connCount--;
  }
  if(!!uid) {
    this.removeLoginedUser(uid);
  }
};

/**
 * 获取统计信息
 *
 * @return {Object} statistics info
 */
pro.getStatisticsInfo = function() {
  var list = [];
  for(var uid in this.logined) {
    list.push(this.logined[uid]);
  }

  return {serverId: this.serverId, totalConnCount: this.connCount, loginedCount: this.loginedCount, loginedList: list};
};
