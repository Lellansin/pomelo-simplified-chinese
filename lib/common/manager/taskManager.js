var sequeue = require('seq-queue');

var manager = module.exports;

var queues = {};

manager.timeout = 3000;

/**
 * 添加任务到任务组. 如果不存在的话创建任务组.
 *
 * @param {String}   key       task key
 * @param {Function} fn        task callback
 * @param {Function} ontimeout task timeout callback
 */
manager.addTask = function(key, fn, ontimeout) {
  var queue = queues[key];
  if(!queue) {
    queue = sequeue.createQueue(manager.timeout);
    queues[key] = queue;
  }

  return queue.push(fn, ontimeout);
};

/**
 * 销毁任务
 *
 * @param  {String} key   task key
 * @param  {Boolean} force whether close task group directly
 */
manager.closeQueue = function(key, force) {
  if(!queues[key]) {
    // 忽略不合法的 key
    return;
  }

  queues[key].close(force);
  delete queues[key];
};
