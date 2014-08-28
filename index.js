module.exports = require('./lib/pomelo');

/*
  require 当前目录会变成 require('./lib/pomelo/index.js')
  而 ./lib/pomelo/index.js 中又继续到处
  最后 require 当前目录会变成 require('./lib/pomelo/pomelo.js')
*/