---
title: Memcache 篇
date: 2016-12-14 13:52:51
tags: [Memcache, Distribution]
---

<img src='https://memcached.org/images/memcached_banner75.jpg'/>

## Memcached简介
Memcached是LiveJournal旗下等Danga Interactive公司等Brad Fitzpatric为首开发等一款开源的、高性能、分布式
软件。通过系统内存管理的缓存机制，将数据缓存到内存中，这么做的目的是目的是为了通过缓存数据库的查询命
中减少数据库压力、提高应用响应速度、提高可扩展性。
memcached存储数据方式：key-value
Memcached有哪些优点：
* 完全开源的项目
* memcache服务类似于一张大的哈希表
* 通过内存缓存大大减少数据库压力
* 支持分布式缓存
* 是client-server类型的应用通过TCP或者UDP协议传输

## Memcached原理分析
Memcached提供了一个缓存机制，首先我们需要明白他的缓存原理，这有助于我们跟好的理解Memcached。

### 内存管理方式
Memcached采用名为[Slab Allocation](https://en.wikipedia.org/wiki/Slab_allocation)的机制分配管理内存.
Slab Allocation的原理是将分配的内存分割成各种尺寸的块（chunk）(具体是根据什么机制来分割的？是根据数据
存储大小分割？)，并把尺寸相同的块分成组（chunk的集合），每个chunk集合被称为slab。一些概念理解：
* Page :分配给Slab 的内存空间，默认是1MB。分配给Slab 之后根据slab 的大小切分成chunk.
* Chunk : 用于缓存记录的内存空间.
* Slab Class:特定大小的chunk 的组.

### memcached分布式原理
首先需要注意memcached是不相互通信的分布式，即一个节点down了那么该节点上的缓存就丢了，不会在其它
节点上找到该缓存信息。memcached的分布式实现主要依赖客户端实现:
![](/images/memcached-distribution.jpg)
如上图所示，当数据到达客户端，客户端实现的算法就会根据“键”来决定保存的memcached服务器，服务器选定
后，命令他保存数据。取的时候也一样，客户端根据“键”选择服务器，使用保存时候的相同算法就能保证选中和
存的时候相同的服务器。
分布式存储支持多种算法：
* 余数计算分散法
* Consistent Hashing算法

如果对算法感兴趣可以深入研究下😄.

## memcached连接查询
我们可以通过telnet命令连接到Memcached服务，并执行增删改查到操作。
语法：
```bash
telnet HOST PORT
```
命令中的 HOST 和 PORT 为运行 Memcached 服务的 IP 和 端口。
### memcached存储命令
以下所有命令参数说明如下：
* key：键值 key-value 结构中的 key，用于查找缓存值。
* flags：可以包括键值对的整型参数，客户机使用它存储关于键值对的额外信息 。
* exptime：在缓存中保存键值对的时间长度（以秒为单位，0 表示永远）
* bytes：在缓存中存储的字节数
* noreply（可选）： 该参数告知服务器不需要返回数据
* value：存储的值（始终位于第二行）（可直接理解为key-value结构中的value）

#### ***Memcached set 命令***
Memcached set 命令用于将***value(数据值) ***存储在指定的 ***key(键)*** 中。
如果set的key已经存在，该命令可以更新该key所对应的原来的数据，也就是实现更新的作用。
<font size=4>语法：</font>
set 命令的基本语法格式如下：
```bash
set key flags exptime bytes [noreply]
value
```
#### ***Memcached add 命令***
Memcached add 命令用于将 ***value(数据值)*** 存储在指定的 ***key(键)*** 中。
如果 add 的 key 已经存在，则不会更新数据，之前的值将仍然保持相同，并且您将获得响应 NOT_STORED。
<font size=4>语法：</font>
add 命令的基本语法格式如下：
```bash
add key flags exptime bytes [noreply]
value
```
#### ***Memcached replace 命令***

Memcached replace 命令用于替换已存在的 ***key(键)*** 的 ***value(数据值)***。
如果 key 不存在，则替换失败，并且您将获得响应 NOT_STORED。
<font size=4>语法：</font>
replace 命令的基本语法格式如下：
```bash
replace key flags exptime bytes [noreply]
value
```
#### ***Memcached append 命令***
Memcached append 命令用于向已存在***key(键)*** 的***value(数据值)*** 后面追加数据 。
<font size=4>语法：</font>
append 命令的基本语法格式如下：
```bash
append key flags exptime bytes [noreply]
value
```
#### ***Memcached prepend 命令***
Memcached prepend 命令用于向已存在 ***key(键)*** 的***value(数据值)*** 前面追加数据 。
<font size=4>语法：</font>
prepend 命令的基本语法格式如下：
```bash
prepend key flags exptime bytes [noreply]
value
```
#### ***Memcached CAS 命令***
Memcached CAS（Check-And-Set 或 Compare-And-Swap） 命令用于执行一个"检查并设置"的操作
它仅在当前客户端最后一次取值后，该key 对应的值没有被其他客户端修改的情况下， 才能够将值写入。
检查是通过cas_token参数进行的， 这个参数是Memcach指定给已经存在的元素的一个唯一的64位值。
<font size=4>语法：</font>
CAS 命令的基本语法格式如下：
```bash
cas key flags exptime bytes unique_cas_token [noreply]
value
```

### Memcached查找命令
1.#### ***Memcached get 命令***
Memcached get 命令获取存储在***key(键)***中的***value(数据值)*** ，如果 key 不存在，则返回空。
<font size=4>语法：</font>
get 命令的基本语法格式如下：
```bash
get key
```
多个 key 使用空格隔开，如下:
```bash
get key1 key2 key3
```
#### ***Memcached gets 命令***
Memcached gets 命令获取带有 CAS 令牌存 的***value(数据值)*** ，如果 key 不存在，则返回空。
<font size=4>语法：</font>
gets 命令的基本语法格式如下：
```bash
gets key
```
多个 key 使用空格隔开，如下:
```bash
gets key1 key2 key3
```
#### ***Memcached delete 命令***
Memcached delete 命令用于删除已存在的***key(键)***。
<font size=4>语法：</font>
delete 命令的基本语法格式如下：
```bash
delete key [noreply]
```
#### ***Memcached incr/decr 命令***
Memcached incr 与 decr 命令用于对已存在的***key(键)*** 的数字值进行自增或自减操作。
incr 与 decr 命令操作的数据必须是十进制的32位无符号整数。
如果 key 不存在返回 NOT_FOUND，如果键的值不为数字，则返回 CLIENT_ERROR，其他错误返回 ERROR。
<font size=5>incr 命令</font>
<font size=4>语法：</font>
incr 命令的基本语法格式如下：
```bash
incr key increment_value
```
参数说明如下：
```bash
key：键值 key-value 结构中的 key，用于查找缓存值。
increment_value： 增加的数值。
```
<font size=5>decr 命令</font>
decr 命令的基本语法格式如下：
```bash
decr key decrement_value
```
参数说明如下：
```bash
key：键值 key-value 结构中的 key，用于查找缓存值。
decrement_value： 减少的数值。
```
### Memcached 统计命令
#### ***Memcached stats 命令***
Memcached stats 命令用于返回统计信息例如 PID(进程号)、版本号、连接数等。
<font size=4>语法：</font>
stats 命令的基本语法格式如下：
```bash
stats
```
#### ***Memcached stats items 命令***
Memcached stats items 命令用于显示各个 slab 中 item 的数目和存储时长(最后一次访问距离现在的秒数)。
<font size=4>语法：</font>
stats items 命令的基本语法格式如下：
```bash
stats items
```
#### ***Memcached stats slabs 命令***
Memcached stats slabs 命令用于显示各个slab的信息，包括chunk的大小、数目、使用情况等。
<font size=4>语法：</font>
stats slabs 命令的基本语法格式如下：
```bash
stats slabs
```
#### ***Memcached stats sizes 命令***
Memcached stats sizes 命令用于显示所有item的大小和个数。
该信息返回两列，第一列是 item 的大小，第二列是 item 的个数。
<font size=4>语法：</font>
stats sizes 命令的基本语法格式如下：
```bash
stats sizes
```
#### ***Memcached stats flush_all 命令***
Memcached flush_all 命令用于用于清理缓存中的所有key=>value(键=>值) 对。
该命令提供了一个可选参数 time，用于在制定的时间后执行清理缓存操作。
<font size=4>语法：</font>
flush_all 命令的基本语法格式如下：
```bash
flush_all [time] [noreply]
```
### ***如何查询memcached中某个slab id 中的Items的key?***
首先用命令stats items查看items信息如下所示：
```bash
stats items
STAT items:1:number 1
STAT items:1:age 10
STAT items:1:evicted 0
STAT items:1:evicted_nonzero 0
STAT items:1:evicted_time 0
STAT items:1:outofmemory 0
STAT items:1:tailrepairs 0
STAT items:1:reclaimed 0
STAT items:1:expired_unfetched 0
STAT items:1:evicted_unfetched 0
STAT items:1:crawler_reclaimed 0
STAT items:1:crawler_items_checked 0
STAT items:1:lrutail_reflocked 0
END
```
从上面输出信息，在'items'后即是slab id ，我们知道了slab id就能查看这个slab中的items，如下所示：
```bash
stats cachedump 1 100
ITEM scorpio [5 b; 1481607870 s]
END
```
从上面命令我们得到了所cache的key值，我们就可以通过该key值用stats get命令查询该key的值.

## 参考资料
https://memcached.org/
https://www.tutorialspoint.com/memcached/memcached_replace_data.htm
http://blog.jobbole.com/101226/
http://www.cnblogs.com/sunniest/p/4437806.html
http://stackoverflow.com/questions/19560150/get-all-keys-set-in-memcached
