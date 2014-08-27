## Pomelo 游戏服务器框架

Pomelo 是一个快速的, 可伸缩的 [node.js](http://nodejs.org) 游戏服务器框架.
它提供了基础的开发框架以及许多相关联的组件 (components) 、库 (libraries) 以及工具 (tools)。
Pomelo 也适用于 实时的 web 应用; 它的分布式架构使其 拥有比其他实时 web 框架更好的拓展性。

[![Build Status](https://travis-ci.org/NetEase/pomelo.svg?branch=master)](https://travis-ci.org/NetEase/pomelo)

 * 英文主页: <http://pomelo.netease.com/>
 * 中文社区: <http://nodejs.netease.com/>
 * 邮件列博: <https://groups.google.com/group/pomelo>
 * 文档: <http://github.com/NetEase/pomelo>
 * 英文Wiki: <https://github.com/NetEase/pomelo/wiki/>
 * 中文Wiki: <https://github.com/NetEase/pomelo/wiki/Home-in-Chinese>
 * 问题: <https://github.com/NetEase/pomelo/issues/>
 * 标签: game, nodejs


## 特性

### 游戏服务器和实时应用服务器架构的完整支持

* 多人游戏: mobile, social, web应用, MMO rpg(中等规模)
* 实时应用: 聊天,  消息推送, 等等.

### 快速, 可伸缩

* 分布式 (多进程) 架构, 可以轻松的伸缩
* 灵活的服务器扩展
* 全性能优化与测试

### 容易上手

* 简单的 API: 请求(request), 响应(response), 广播(broadcast), 等等.
* 轻量级: 享受Node.js的效率高开发
* 约定优于配置原则: 几乎零配置

### 强大的支持

* 客户端支持，包括 javascript、flash、android、iOS、cocos2d-x、C
* 库和工具，包括命令行工具、管理员工具、性能测试工具、AI、路劲查找等等.
* 详细的参考资料: 完整的文档, 大量的例子以及[一个开源的 MMORPG 演示](https://github.com/NetEase/pomelo/wiki/Introduction-to--Lord-of-Pomelo)

### 可扩展的

* 支持插件系统, 开源简单的通过插件添加新的功能. 我们同样提供许多插件如：在线状态, master high availability.
* 自定义功能, 开发人员可以很容易的定义自己的网络协议, 以及自定义组件.

## 为什么我要使用 pomelo?
一个快速的、可伸缩的、实时的游戏服务器开发，不是一个简单的工作，一个好的容器或者框架可以降低其复杂性。
不幸的是, 与web开发不同, 想要找到一个游戏服务器框架的解决方案是很难的, 特别是开源的解决方案. Pomelo 填补这一空白, 提供了一个用于创建游戏服务器框架的完整解决方案。
Pomelo 有如下几点优势:
* 架构是可伸缩的。 It uses a multi-process, single thread runtime architecture, which has been proven in the industry and is especially suited to the node.js thread model.
* 容易使用, the development model is quite similar to web, using convention over configuration, with almost zero config. The [API](http://pomelo.netease.com/api.html) is also easy to use.
* 框架可拓展. Based on the node.js micro module principle, the core of pomelo is small. All of the components, libraries and tools are individual npm modules, and anyone can create their own module to extend the framework.
* 拥有完整的开发资料和文档. In addition to the documentation, we also provide [an open-source MMO RPG demo](https://github.com/NetEase/pomelo/wiki/Introduction-to--Lord-of-Pomelo) (HTML5 client), which is a far better reference material than any book.

## 我如何参加开发 pomelo?
通过如下索引, 你可以快速的熟悉 pomelo 开发流程:
* [Pomelo documents](https://github.com/NetEase/pomelo/wiki)
* [Getting started](https://github.com/NetEase/pomelo/wiki/Welcome-to-Pomelo)
* [Tutorial](https://github.com/NetEase/pomelo/wiki/Preface)


## 贡献者
* NetEase, Inc. (@NetEase)
* Peter Johnson(@missinglink)
* Aaron Yoshitake 
* @D-Deo 
* Eduard Gotwig
* Eric Muyser(@stokegames)
* @GeforceLee
* Harold Jiang(@jzsues)
* @ETiV
* [kaisatec](https://github.com/kaisatec)
* [roytan883](https://github.com/roytan883)
* [wuxian](https://github.com/wuxian)
* [zxc122333](https://github.com/zxc122333)
* [newebug](https://github.com/newebug)
* [jiangzhuo](https://github.com/jiangzhuo)
* [youxiachai](https://github.com/youxiachai)
* [qiankanglai](https://github.com/qiankanglai)
* [xieren58](https://github.com/xieren58)
* [prim](https://github.com/prim)
* [Akaleth](https://github.com/Akaleth)
* [pipi32167](https://github.com/pipi32167)
* [ljhsai](https://github.com/ljhsai)
* [zhanghaojie](https://github.com/zhanghaojie)
* [airandfingers](https://github.com/airandfingers)

## License

(The MIT License)

Copyright (c) 2012-2014 NetEase, Inc. and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# 译者注

由于 github 上同一个项目只能 fork 一次，这是为什么笔者新开一个项目而不 fork 来的原因（笔者原来已经 fork 过一次了）。而且考虑到不一定能实时更新，以后新版本不停的出来要不停的注释也是一个负担，所以笔者这里只打算做好这一个版本的注释。