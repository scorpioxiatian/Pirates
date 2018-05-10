---
title: linux常用shell脚本记录（附带脚本解析）
date: 2018-05-10 16:09:08
tags: shell
---

由于工作中经常会用到一些shell来统计或者做一些批量操作，一些shell用的少，突然用的时候可能会忘记。本文用于记录工作中用到shell命令，以便日后备用。好记性不如烂笔头嘛！！！

### 统计服务器socket连接数

```shell
netstat -n | awk '/^tcp/ {++S[$NF]} END {for(a in S) print a, S[a]}'
```

shell脚本解析：通过netstat列出当前socket连接信息，并通过管道将结果传递给awk命令，作为awk命令处理的参数，awk命令首先执行正则匹配，过滤出TCP socket，然后用$NF取行的最后一个值作为统计值进行sum统计，最后将得到的数组S打印出来。

awk内建函数参考示例： https://www.linuxnix.com/awk-scripting-learn-awk-built-in-variables-with-examples/

题外话：[Unix domain socket 和 TCP/IP socket 的区别](https://jaminzhang.github.io/network/the-difference-between-unix-domain-socket-and-tcp-ip-socket/)