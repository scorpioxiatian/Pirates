---
title: VMware Fusion 设置端口转发
date: 2017-04-13 16:06:00
tags: [VMware Fusion,NAT,network]
---

# 背景

VMware Fusion没有提供图形化的虚拟网络编辑器，当我们选用nat网络类型，我们需要端口转发的功能，那么我们需要如何设置呢？下面我们就介绍下如何在mac系统中设置虚拟机端口转发。

# 配置方法

虽然VMware Fusion没有提供图形化界面来支持端口转发的功能，但是我们可以通过修改网络配置文件来达到该目的。原理很简单我们只需要修改相应的网络配置文件，然后重启网络服务即可。下面我们将介绍具体的操作步骤：

1. **修改配置文件**

   VMware Fusion 的 NAT 配置文件位于 */Library/Preferences/VMware Fusion/vmnet8/nat.conf* ，打开配置文件：

   ```basic
   sudo vi /Library/Preferences/VMware\ Fusion/vmnet8/nat.conf
   ```

   修改*[incomingtcp]* 部分，添加相应的端口转发即可。如下所示：

   ```basic
   [incomingtcp]

   # Use these with care - anyone can enter into your VM through these...
   # The format and example are as follows:
   #<external port number> = <VM's IP address>:<VM's port number>
   #8080 = 172.16.3.128:80
   8080 = 192.168.125.130:22 (根据需求添加即可)
   8081 = 192.168.125.129:22
   ```

2. **重启虚拟网络服务**

   两种方式重启虚拟网络：

   - 重启VMware Fusion

   - 执行以下命令直接重启网络模块

     ```basic
     sudo /Applications/VMware\ Fusion.app/Contents/Library/vmnet-cli --stop
     sudo /Applications/VMware\ Fusion.app/Contents/Library/vmnet-cli --start
     ```

