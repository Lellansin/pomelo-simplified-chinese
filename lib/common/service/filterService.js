var logger = require('pomelo-logger').getLogger('pomelo', __filename);

/**
 * 过滤器服务.
 * Register and fire before and after filters.
 */
var Service = function() {
  this.befores = [];    // before filters
  this.afters = [];     // after filters
};

module.exports = Service;

Service.prototype.name = 'filter';

/**
 * 添加 before filter 到过滤链中
 *
 * @param filter {Object|Function} filter instance or filter function.
 */
Service.prototype.before = function(filter){
  this.befores.push(filter);
};

/**
 * 添加 after filter 到过滤链中
 *
 * @param filter {Object|Function} filter instance or filter function.
 */
Service.prototype.after = function(filter){
  this.afters.unshift(filter);
};

/**
 * TODO: other insert method for filter? such as unshift
 */

/**
 * 执行前置过滤
 * Fail over if any filter pass err parameter to the next function.
 *
 * @param msg {Object} clienet request msg
 * @param session {Object} a session object for current request
 * @param cb {Function} cb(err) callback function to invoke next chain node
 */
Service.prototype.beforeFilter = function(msg, session, cb) {
  var index = 0, self = this;
  var next = function(err, resp, opts) {
    if(err || index >= self.befores.length) {
      cb(err, resp, opts);
      return;
    }

    var handler = self.befores[index++];
    if(typeof handler === 'function') {
      handler(msg, session, next);
    } else if(typeof handler.before === 'function') {
      handler.before(msg, session, next);
    } else {
      logger.error('meet invalid before filter, handler or handler.before should be function.');
      next(new Error('invalid before filter.'));
    }
  }; //end of next

  next();
};

/**
 * 执行后置过滤.
 * Give server a chance to do clean up jobs after request responsed.
 * After filter can not change the request flow before.
 * After filter should call the next callback to let the request pass to next after filter.
 *
 * @param err {Object} error object
 * @param session {Object} session object for current request
 * @param {Object} resp response object send to client
 * @param cb {Function} cb(err) callback function to invoke next chain node
 */
Service.prototype.afterFilter = function(err, msg, session, resp, cb) {
  var index = 0, self = this;
  function next(err) {
    //if done
    if(index >= self.afters.length) {
      cb(err);
      return;
    }

    var handler = self.afters[index++];
    if(typeof handler === 'function') {
      handler(err, msg, session, resp, next);
    } else if(typeof handler.after === 'function') {
      handler.after(err, msg, session, resp, next);
    } else {
      logger.error('meet invalid after filter, handler or handler.before should be function.');
      next(new Error('invalid after filter.'));
    }
  } //end of next

  next(err);
};
