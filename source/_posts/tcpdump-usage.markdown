---
layout: post
title:  "tcpdump命令详解"
date:   2016-05-22 09:00:13
categories: Network
tags: tcpdump
---
这篇文章主要是记录关于tcpdump的使用，tcpdump是常用的抓包工具，该工具可以灵活的抓取在网络中包传输。
（操作系统：ubuntu 15.04）
## tcpdump命令格式
注意：详细解释可以通过man tcpdump来查看。
tcpdump [-i 网卡] -nnAX '表达式'
参数意义：
-i: interface 监听的网卡
-nn：表示以ip和port的方式显示来源主机和目的主机，而不是用主机名和服务
-A：以ascii的方式显示数据包，抓取web数据时很有用
-X：数据包将会以16进制和ascii的方式显示（这样显示有什么好处？）
表达式：表达式有很多种，常见的有：host 主机；port 端口；src host 发包主机；dst host 收包主机。多个条件可以用and、or组合，取反可以使用!，更多的使用可以查看man 7 pcap-filter。
## 监听网卡
~~~
# 监听eth0网卡
tcpdump -i eth0
~~~
可以使用ifconfig命令来查看网卡信息，以便通过tcpdump命令来监听相应网卡。
## 监听指定协议的数据
~~~
# 表示监听eth0网卡，并且只接收icmp协议数据
tcpdump -i eth0 -nn 'icmp'
~~~
监听icmp协议类型数据，icmp即ping命令使用的协议。常用的协议类型有tcp,udp等。
示例：
![](/images/tcpdump.png)
以上是抓取icmp协议类型数据，数据含义：
抓到包的时间 IP 发包的主机和端口 > 接收的主机和端口 数据包内容
## 监听指定的主机
~~~
tcpdump -i eth0 -nn 'host 192.168.1.231'
~~~
该命令表示抓取主机192.168.1.231的发送包和接收包
~~~
tcpdump -i eth0 -nn 'src host 192.168.1.231'
~~~
表示只抓取主机192.168.1.231发送的包
~~~
tcpdump -i eth0 -nn 'dst host 192.168.1.231'
~~~
表示只抓取主机192.168.1.231接收到的包
## 监听指定端口
~~~
tcpdump -i eth0 -nnA 'port 80'
~~~
该命令表示抓取80端口的数据包，并以ascii的方式显示数据包，在web开发中很实用
## 监听指定主机和端口
~~~
tcpdump -i eth0 -nnA 'port 80 and src host 192.168.1.231'
~~~
多个条件可以用and，or连接。上例表示监听192.168.1.231主机通过80端口发送的数据包。
## 监听除某个端口外的其它端口
~~~
tcpdump -i eth0 -nnA '!port 22'
~~~
如果需要排除某个端口或者主机，可以使用“!”符号，上例表示监听非22端口的数据包。
-----------------------------------------------华丽分割线-----------------------------------------
以上内容记录以备后用。。。。。。。
