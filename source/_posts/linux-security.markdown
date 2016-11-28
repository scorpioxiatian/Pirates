---
layout: post
title:  "linux病毒扫描软件ClamAV安装于使用"
date:   2016-03-27 09:00:13
categories: linux
permalink: /articles/linux/2016328
---
近期安装的几台虚拟机网络出去流量高的惊人，达到400~600M/s，直接导致网络几乎瘫痪。直接导致远程连接不上主机，网络延迟特别高。查询原因发现后台有一个进程消耗一半cpu，并且该进程杀死后又会自动启动另外一个进程，无法杀掉。当断掉公网ip后就能kill掉该进程，且不会再自动启动。且该局域网中所有主机均出现该状况，
根据该现象有可能是ddos攻击导致。于是上网查了一些杀毒软件，试图kill掉该病毒。网上查询到了一款ubuntu上的开源杀毒软件，尝试了以下果然有效果。下面我们来介绍下这款软件clamAV，尝试了以下果然有效果。下面我们来介绍下这款软件clamAV。
## 什么是clamAV
clamAV全名Clam AntiVirus，是一款开源的杀毒软件，能够预防许多的恶意软件主要应用于邮件服务器。扫描并清理系统中的恶意软件。
clamAV包含了大量的实用程序如：命令行扫描，自动跟新数据库和可扩展多线程守护进程，以及反病毒引擎。
接下来我们就来介绍下clamAV的安装和使用。
## 安装＆配置
1.安装软件包
clamAV安装方法有很多可以直接去官网[下载](http://www.clamav.net/download.html)并进行安装，为了方便我们可以直接执行以下命令直接在ubuntu系统中安装该软件包：
```
# 如果安装不了我们可以先更新下软件源`apt-get update`
sudo apt-get install clamav clamav-daemon
```
2.更新病毒数据库
安装完成后clamAV会提示你安装病毒数据库，clamAV会根据数据库中提供的数据对系统进行搜索查询，我们只需要执行以下命令来同步远程病毒数据库,该命令会下载main.cvd和daily.cvd文件。
```
sudo freshclam
```
## clamAV使用
安装很简单，使用更简单，就一个`clamscan`命令即可。示例：
```
# 扫描/home目录下的文件
clamscan -r /home
# 全盘扫描(该命令可能执行时间比较长)
clamscan -r /
# 格式化输出，只输出显示病毒文件或者是恶意进程
clamscan -r --bell -i /
# 查询任意位置，并将结果写入新文件记录
sudo clamscan -r /folder/to/scan/ | grep FOUND >> /path/to/save/report/myfile.txt
```
如上命令会扫描目录，如果发现恶意软件或者病毒文件会自动清理
我们还可以为clamAV建立定时任务执行如下命令：
```
crontab -e
```
并在定时任务中写入如下任务
```
00 00 * * * clamscan -r /location_of_files_or_folder # 根据实际指定搜索文件夹
```
另外如果你不习惯使用命令行，还可以使用clamAV的GUI界面，需要执行以下命令安装GUI
```
sudo apt-get install ClamTK
```
