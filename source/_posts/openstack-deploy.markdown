---
layout: post
title:  "openstack 多节点安装"
date:   2016-03-27 09:00:13
categories: openstack
---
本文记录双节点openstack部署流程,根据[官方文档](http://docs.openstack.org/liberty/install-guide-ubuntu/),一步一步搭建openstack,并且记录搭建过程遇到的坑。
## 概要
openstack是一个开源社区，提供IAAS解决方案，我们首先来了解下基础服务：
* [Horizon](http://docs.openstack.org/developer/horizon/):面板服务，直接面向用户，为用户提供可视操作。
* [Nova](http://docs.openstack.org/developer/nova/):计算服务，提供计算机生命周期管理，如新建虚拟机等。
* [Neutron](http://docs.openstack.org/developer/neutron/):网络服务，提供云计算环境下的虚拟网络功能。
* [Keystone](http://docs.openstack.org/developer/keystone/):认证服务，提供用户认证以及openstack中服务认证。
* [Glance](http://docs.openstack.org/developer/glance/):镜像服务，提供镜像存储。
* [Ceilometer](http://docs.openstack.org/developer/ceilometer/):监控服务，负责资源监控实时了解资源情况。
* [Swift](http://docs.openstack.org/developer/swift/):对象存储服务，提供多租户的对象存储。
* [Cinder](http://docs.openstack.org/developer/cinder/):块存储服务，提供块存储。
## 部署架构
### 硬件架构
![部署结构图](/images/hwreqs.png)
常规部署主要有分为控制节点，计算节点，网络节点。我们以最简方式部署，如上图所示使用两个节点，控制节点和计算节点，我们不单独部署网络节点将网络agent部署在控制节点不单独部署在网络节点。另外配置至少如上要求所示。
### 软件架构
1.软件部署架构如下图所示：
![](/images/network2-services.png)
**控制节点**
控制节点主要部署openstack基础服务如：keystone,horizon,Neutron等，以及基础服务的支持服务，如：消息队列，NTP，mysql等。
**计算节点**
计算节点主要部署hypervisor，根据nova调度算法创建实例，以及网络服务。
2.网络拓扑架构图：
![](/images/networklayout.png)
## 环境准备
### 基础环境搭建
以下环境搭建在通过[ustack](https://console.ustack.com)云平台进行搭建：
1. 新建路由器route0
2. 创建私有网络public-network和management-network
3. 申请名为net的公网并且绑定到路由器route
4. 将私有网络public-network关联到路由器route
5. 创建控制节点controller(2vcpu,8G)和计算节点compute(4vcpu,8G),将controller加入私有网络public-network,将compute加入私有网络public-network和management-network
搭建完成后网络拓扑如下所示：
![](/images/topology.png)
### 配置host
接着我们来配置控制节点和计算几点host
修改文件/etc/hosts,如下所示：
~~~
# 控制节点编辑文件/etc/hosts
192.168.2.2 controller
192.168.2.5 compute
# 计算节点同上操作
192.168.2.2 controller
192.168.2.5 compute
~~~
可以通过以下命令在控制节点和计算节点验证是否配置正确：

> root@compute:~# ping controller
> PING controller (192.168.2.2) 56(84) bytes of data.
> 64 bytes from controller (192.168.2.2): icmp_seq=1 ttl=64 time=0.407 ms
> 64 bytes from controller (192.168.2.2): icmp_seq=2 ttl=64 time=0.508 ms
> 64 bytes from controller (192.168.2.2): icmp_seq=3 ttl=64 time=0.571 ms
> root@compute:~# ping -c 4 openstack.org
> PING openstack.org (162.242.140.107) 56(84) bytes of data.
> 64 bytes from 162.242.140.107: icmp_seq=1 ttl=42 time=386 ms
> 64 bytes from 162.242.140.107: icmp_seq=2 ttl=42 time=384 ms
> 64 bytes from 162.242.140.107: icmp_seq=3 ttl=42 time=386 ms

### 安装支持软件
#### 安装NTP服务
控制节点controller：
1.安装chrony包
```
apt-get install chrony
```
2.编辑文件/etc/chrony/chrony.conf插入以下内容
```
# 以asia.pool.ntp.org时间为例
server asia.pool.ntp.org iburst
```
3.重启NTP服务
```
service chrony restart
```
计算节点compute：
安装步骤跟控制节点一样，在编辑/etc/chrony/chrony.conf文件时需要插入以下内容：
```
# 表示跟controller节点时间同步
server controller iburst
```
验证：
```
# *表示当前所用的时间
# 控制节点
root@controller:~# chronyc sources
210 Number of sources = 1
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* host-2.net50.sol.az           4   6   177    55  +3003us[ +313us] +/-  694ms
# 计算节点
root@compute:~# chronyc sources
210 Number of sources = 1
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* controller                    5   6   377    36  +4607us[  +27ms] +/-  734ms
```
#### 安装openstack软件包支持
该操作在所有节点均执行
修改文件/etc/apt/sources.list，增加以下内容：

> deb http://ubuntu-cloud.archive.canonical.com/ubuntu trusty-updates/liberty main

执行命令：
```
apt-get update && apt-get dist-upgrade
```
如果出现如下错误：

> error:
> W: GPG error: http://ubuntu-cloud.archive.canonical.com trusty-updates/liberty Release: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 5EDB1B62EC4926EA
> 执行命令```apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5EDB1B62EC4926EA```后在运行```apt-get update && apt-get dist-upgrade```

#### 安装SQL数据库
在控制节点执行如下操作：
1.安装sql包,并且设置root用户密码
```
apt-get install mariadb-server python-pymysql
```
2.修改文件/etc/mysql/my.cnf并添加如下内容允许所有节点请求。
```
[mysqld]
bind-address = 0.0.0.0
```
3.重启sql服务
```
service mysql restart
```
#### 安装消息队列rabbitmq
1.安装rabbitmq软件包
```
apt-get install rabbitmq-server
```
2.添加openstack用户
```
rabbitmqctl add_user openstack root
```
3.给openstack用户添加读写权限
```
rabbitmqctl set_permissions openstack ".*" ".*" ".*"
```
## 安装openstack软件
### 安装keystone
#### 创建keystone数据库
创建keystone数据库以及生成admin token
1.登入数据库
```
mysql -uroot
```
2.创建keystone数据库
```
CREATE DATABASE keystone;
```
3.添加数据库访问权限
```
GRANT ALL PRIVILEGES ON keystone.* TO 'keystone'@'localhost' \
  IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON keystone.* TO 'keystone'@'%' \
  IDENTIFIED BY 'root';
```
#### 随机生成admin token
执行以下命令生成admin token以便后续步骤使用
```
root@controller:~# openssl rand -hex 10
e770648f049dd983575b
```
#### 安装keystone服务
1.从源安装keystone
```
# 禁止安装完后启动服务
echo "manual" > /etc/init/keystone.override
apt-get install keystone apache2 libapache2-mod-wsgi \
  memcached python-memcache
```
2.配置keystone配置文件/etc/keystone/keystone.conf,修改以下配置
```
[DEFAULT]
...
admin_token = e770648f049dd983575b
[database]
...
connection = mysql://keystone:root@controller/keystone?charset=utf8
[memcache]
...
servers = localhost:11211
[token]
...
provider = uuid
driver = memcache
[revoke]
...
driver = sql
[DEFAULT]
...
verbose = True
```
3.同步数据库
```
su -s /bin/sh -c "keystone-manage db_sync" keystone
```
#### 配置apache服务器
1.编辑文件/etc/apache2/apache2.conf修改Servername
```
ServerName controller
```
2.创建文件/etc/apache2/sites-available/wsgi-keystone.conf，并添加如下内容
```
Listen 5000
Listen 35357
<VirtualHost *:5000>
    WSGIDaemonProcess keystone-public processes=5 threads=1 user=keystone group=keystone display-name=%{GROUP}
    WSGIProcessGroup keystone-public
    WSGIScriptAlias / /usr/bin/keystone-wsgi-public
    WSGIApplicationGroup %{GLOBAL}
    WSGIPassAuthorization On
    <IfVersion >= 2.4>
      ErrorLogFormat "%{cu}t %M"
    </IfVersion>
    ErrorLog /var/log/apache2/keystone.log
    CustomLog /var/log/apache2/keystone_access.log combined
    <Directory /usr/bin>
        <IfVersion >= 2.4>
            Require all granted
        </IfVersion>
        <IfVersion < 2.4>
            Order allow,deny
            Allow from all
        </IfVersion>
    </Directory>
</VirtualHost>
<VirtualHost *:35357>
    WSGIDaemonProcess keystone-admin processes=5 threads=1 user=keystone group=keystone display-name=%{GROUP}
    WSGIProcessGroup keystone-admin
    WSGIScriptAlias / /usr/bin/keystone-wsgi-admin
    WSGIApplicationGroup %{GLOBAL}
    WSGIPassAuthorization On
    <IfVersion >= 2.4>
      ErrorLogFormat "%{cu}t %M"
    </IfVersion>
    ErrorLog /var/log/apache2/keystone.log
    CustomLog /var/log/apache2/keystone_access.log combined
    <Directory /usr/bin>
        <IfVersion >= 2.4>
            Require all granted
        </IfVersion>
        <IfVersion < 2.4>
            Order allow,deny
            Allow from all
        </IfVersion>
    </Directory>
</VirtualHost>
```
3.允许加载keystone服务并重启apache服务器
```
ln -s /etc/apache2/sites-available/wsgi-keystone.conf /etc/apache2/sites-enabled
service apache2 restart
```
#### 创建service entity和API endpoints
1.配置认证信息
```
export OS_TOKEN=e770648f049dd983575b
export OS_URL=http://controller:35357/v3
export OS_IDENTITY_API_VERSION=3
```
2.创建keystone服务
```
root@controller:~# openstack service create \
   --name keystone --description "OpenStack Identity" identity
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | OpenStack Identity               |
| enabled     | True                             |
| id          | 70c001520bc346f5a24cbce02251edc0 |
| name        | keystone                         |
| type        | identity                         |
+-------------+----------------------------------+
```
3.创建endpoints
```
root@controller:~# openstack endpoint create --region RegionOne \
   identity public http://controller:5000/v2.0
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | 20ff23f26e9044bab521cf3aa449107c |
| interface    | public                           |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 70c001520bc346f5a24cbce02251edc0 |
| service_name | keystone                         |
| service_type | identity                         |
| url          | http://controller:5000/v2.0      |
+--------------+----------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   identity internal http://controller:5000/v2.0
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | 2f61696b382f4d18be1dbf26958affc9 |
| interface    | internal                         |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 70c001520bc346f5a24cbce02251edc0 |
| service_name | keystone                         |
| service_type | identity                         |
| url          | http://controller:5000/v2.0      |
+--------------+----------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   identity admin http://controller:35357/v2.0
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | cce98996793948f8841e9e809c1fcce0 |
| interface    | admin                            |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 70c001520bc346f5a24cbce02251edc0 |
| service_name | keystone                         |
| service_type | identity                         |
| url          | http://controller:35357/v2.0     |
+--------------+----------------------------------+
```
#### 创建projects, users, and roles
1.创建管理员用户
```
# 创建管理员项目
root@controller:~# openstack project create --domain default \
   --description "Admin Project" admin
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | Admin Project                    |
| domain_id   | default                          |
| enabled     | True                             |
| id          | ae557b315d7c430c929f31b480084ada |
| is_domain   | False                            |
| name        | admin                            |
| parent_id   | None                             |
+-------------+----------------------------------+
# 创建admin账户
root@controller:~# openstack user create --domain default \
   --password-prompt admin
User Password:
Repeat User Password:
+-----------+----------------------------------+
| Field     | Value                            |
+-----------+----------------------------------+
| domain_id | default                          |
| enabled   | True                             |
| id        | 59a21d5fea5a42908d5911635eb92742 |
| name      | admin                            |
+-----------+----------------------------------+
# 创建admin角色
root@controller:~# openstack role create admin
+-------+----------------------------------+
| Field | Value                            |
+-------+----------------------------------+
| id    | 28754433fefd4572be420fcf91be7788 |
| name  | admin                            |
+-------+----------------------------------+
# 添加权限
root@controller:~# openstack role add --project admin --user admin admin
```
2.创建service项目
```
root@controller:~# openstack project create --domain default \
   --description "Service Project" service
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | Service Project                  |
| domain_id   | default                          |
| enabled     | True                             |
| id          | c0f3b4ac140e4d98a4ec87adbfb54c60 |
| is_domain   | False                            |
| name        | service                          |
| parent_id   | None                             |
+-------------+----------------------------------+
```
3.创建普通用户
```
# 创建demo项目
root@controller:~# openstack project create --domain default \
   --description "Demo Project" demo
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | Demo Project                     |
| domain_id   | default                          |
| enabled     | True                             |
| id          | 89149a8b334a4a05bf50772944d41dad |
| is_domain   | False                            |
| name        | demo                             |
| parent_id   | None                             |
+-------------+----------------------------------+
# 创建demo用户
root@controller:~# openstack user create --domain default \
   --password-prompt demo
User Password:
Repeat User Password:
+-----------+----------------------------------+
| Field     | Value                            |
+-----------+----------------------------------+
| domain_id | default                          |
| enabled   | True                             |
| id        | c86e83459c21400c9092e4b68aac0e6e |
| name      | demo                             |
+-----------+----------------------------------+
# 创建user角色
root@controller:~# openstack role create user
+-------+----------------------------------+
| Field | Value                            |
+-------+----------------------------------+
| id    | 48b053ac809d48d58b0032e52be9d057 |
| name  | user                             |
+-------+----------------------------------+
# 分配角色
root@controller:~# openstack role add --project demo --user demo user
```
#### 验证配置
1.清除原有环境变量
```
unset OS_TOKEN OS_URL
```
2.使用用户名密码获取token
```
root@controller:~#  openstack --os-auth-url http://controller:35357/v3 \
   --os-project-domain-id default --os-user-domain-id default \
   --os-project-name admin --os-username admin --os-auth-type password \
   token issue
Password:
+------------+----------------------------------+
| Field      | Value                            |
+------------+----------------------------------+
| expires    | 2016-03-24T11:06:17.423633Z      |
| id         | d55f1ceaabf14b93aef5516c497c2d7e |
| project_id | ae557b315d7c430c929f31b480084ada |
| user_id    | 59a21d5fea5a42908d5911635eb92742 |
+------------+----------------------------------+
```
#### 创建openstack命令行证书文件
新建文件admin-openrc.sh，并添加如下内容：
```
export OS_PROJECT_DOMAIN_ID=default
export OS_USER_DOMAIN_ID=default
export OS_PROJECT_NAME=admin
export OS_TENANT_NAME=admin
export OS_USERNAME=admin
export OS_PASSWORD=root #根据实际填写
export OS_AUTH_URL=http://controller:35357/v3
export OS_IDENTITY_API_VERSION=3
```
### 安装镜像服务glance
#### 基础配置准备
1.进入数据库服务创建glance数据库
```
# 创建glance数据库
CREATE DATABASE glance;
分配相应的访问权限
GRANT ALL PRIVILEGES ON glance.* TO 'glance'@'localhost' \
  IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON glance.* TO 'glance'@'%' \
  IDENTIFIED BY 'root';
```
2.source证书文件admin-openrc.sh
```
root@controller:~# source admin-openrc.sh
```
3.在keystone中创建glance用户信息
```
# 创建glance用户
root@controller:~# openstack user create --domain default --password-prompt glance
User Password:
Repeat User Password:
+-----------+----------------------------------+
| Field     | Value                            |
+-----------+----------------------------------+
| domain_id | default                          |
| enabled   | True                             |
| id        | dc680f9b12e44ebb93c91dfdeeabcb8f |
| name      | glance                           |
+-----------+----------------------------------+
# 为glance用户在service项目添加admin权限
root@controller:~# openstack role add --project service --user glance admin
# 创建glance服务
root@controller:~# openstack service create --name glance \
   --description "OpenStack Image service" image
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | OpenStack Image service          |
| enabled     | True                             |
| id          | 0fc59e7791d9463085c7f84a39c1f3c8 |
| name        | glance                           |
| type        | image                            |
+-------------+----------------------------------+
# 创建镜像服务endpoint
root@controller:~# openstack endpoint create --region RegionOne \
   image public http://controller:9292
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | 9c34be6312974f9dabc8783816771103 |
| interface    | public                           |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 0fc59e7791d9463085c7f84a39c1f3c8 |
| service_name | glance                           |
| service_type | image                            |
| url          | http://controller:9292           |
+--------------+----------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   image internal http://controller:9292
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | a6f97076343248ec98ec7a800ec94577 |
| interface    | internal                         |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 0fc59e7791d9463085c7f84a39c1f3c8 |
| service_name | glance                           |
| service_type | image                            |
| url          | http://controller:9292           |
+--------------+----------------------------------+
root@controller:~#  openstack endpoint create --region RegionOne \
   image admin http://controller:9292
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | e01dbccee82a406e8deaae02b6590b44 |
| interface    | admin                            |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 0fc59e7791d9463085c7f84a39c1f3c8 |
| service_name | glance                           |
| service_type | image                            |
| url          | http://controller:9292           |
+--------------+----------------------------------+
```
#### 安装配置glance软件包
1.安装软件包
```
apt-get install glance python-glanceclient
```
2.修改配置文件/etc/glance/glance-api.conf和/etc/glance/glance-registry.conf
```
# 修改文件/etc/glance/glance-api.conf
[database]
...
connection = mysql+pymysql://glance:GLANCE_DBPASS@controller/glance
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = glance
password = root
[paste_deploy]
...
flavor = keystone
[glance_store]
...
default_store = file
filesystem_store_datadir = /var/lib/glance/images/
[DEFAULT]
...
notification_driver = noop
verbose = True
===============================================================
# 修改配置文件/etc/glance/glance-registry.conf
[database]
...
connection = mysql+pymysql://glance:root@controller/glance
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = glance
password = root
[paste_deploy]
...
flavor = keystone
[DEFAULT]
...
notification_driver = noop
verbose = True
```
3.同步glance数据库并重启服务
```
# 同步数据库
su -s /bin/sh -c "glance-manage db_sync" glance
# 重启服务
service glance-registry restart
service glance-api restart
```
p
#### 验证glance服务
1.将镜像版本信息写入证书文件admin-openrc.sh
```
echo "export OS_IMAGE_API_VERSION=2" \
  | tee -a admin-openrc.sh
```
2.source文件admin-openrc.sh
```
source admin-openrc.sh
```
3.下载测试镜像
```
wget http://download.cirros-cloud.net/0.3.4/cirros-0.3.4-x86_64-disk.img
```
4.在glance创建镜像
```
# 创建镜像
root@controller:~# glance image-create --name "cirros" \
   --file cirros-0.3.4-x86_64-disk.img \
   --disk-format qcow2 --container-format bare \
   --visibility public --progress
[=============================>] 100%
+------------------+--------------------------------------+
| Property         | Value                                |
+------------------+--------------------------------------+
| checksum         | ee1eca47dc88f4879d8a229cc70a07c6     |
| container_format | bare                                 |
| created_at       | 2016-03-25T06:23:07Z                 |
| disk_format      | qcow2                                |
| id               | 67cfd037-5704-4432-9b2c-cf5fffdb6319 |
| min_disk         | 0                                    |
| min_ram          | 0                                    |
| name             | cirros                               |
| owner            | ae557b315d7c430c929f31b480084ada     |
| protected        | False                                |
| size             | 13287936                             |
| status           | active                               |
| tags             | []                                   |
| updated_at       | 2016-03-25T06:23:08Z                 |
| virtual_size     | None                                 |
| visibility       | public                               |
+------------------+--------------------------------------+
]]
# 查看镜像
root@controller:~# glance image-list
+--------------------------------------+--------+
| ID                                   | Name   |
+--------------------------------------+--------+
| 67cfd037-5704-4432-9b2c-cf5fffdb6319 | cirros |
+--------------------------------------+--------+
```
### 安装计算服务Nova
#### 安装控制节点
##### 前期准备
1.创建nova数据库，并分配权限
```
# 创建数据库
CREATE DATABASE nova;
# 分配访问权限
GRANT ALL PRIVILEGES ON nova.* TO 'nova'@'localhost' \
  IDENTIFIED BY 'NOVA_DBPASS';
GRANT ALL PRIVILEGES ON nova.* TO 'nova'@'%' \
  IDENTIFIED BY 'NOVA_DBPASS';
```
2.在keystone中创建nova用户,服务以及endpoint
```
# 创建账户
root@controller:~# openstack user create --domain default --password-prompt nova
User Password:
Repeat User Password:
+-----------+----------------------------------+
| Field     | Value                            |
+-----------+----------------------------------+
| domain_id | default                          |
| enabled   | True                             |
| id        | 77a5b14032ed484ebeefa981e1c0ac00 |
| name      | nova                             |
+-----------+----------------------------------+
# 给nova添加admin权限
root@controller:~# openstack role add --project service --user nova admin
# 创建nova服务
root@controller:~# openstack service create --name nova \
   --description "OpenStack Compute" compute
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | OpenStack Compute                |
| enabled     | True                             |
| id          | 023a040a53b44ff69cb9d5d8f210323b |
| name        | nova                             |
| type        | compute                          |
+-------------+----------------------------------+
# 添加endpoint
root@controller:~# openstack endpoint create --region RegionOne \
   compute public http://controller:8774/v2/%\(tenant_id\)s
+--------------+-----------------------------------------+
| Field        | Value                                   |
+--------------+-----------------------------------------+
| enabled      | True                                    |
| id           | df485e2cbf9b414ab57be9d9a0d9b253        |
| interface    | public                                  |
| region       | RegionOne                               |
| region_id    | RegionOne                               |
| service_id   | 023a040a53b44ff69cb9d5d8f210323b        |
| service_name | nova                                    |
| service_type | compute                                 |
| url          | http://controller:8774/v2/%(tenant_id)s |
+--------------+-----------------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   compute internal http://controller:8774/v2/%\(tenant_id\)s
+--------------+-----------------------------------------+
| Field        | Value                                   |
+--------------+-----------------------------------------+
| enabled      | True                                    |
| id           | bf83399e62c0481593d3c923ddce2820        |
| interface    | internal                                |
| region       | RegionOne                               |
| region_id    | RegionOne                               |
| service_id   | 023a040a53b44ff69cb9d5d8f210323b        |
| service_name | nova                                    |
| service_type | compute                                 |
| url          | http://controller:8774/v2/%(tenant_id)s |
+--------------+-----------------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   compute admin http://controller:8774/v2/%\(tenant_id\)s
+--------------+-----------------------------------------+
| Field        | Value                                   |
+--------------+-----------------------------------------+
| enabled      | True                                    |
| id           | 1a3972fe66f243b08bbc5e98e27b3110        |
| interface    | admin                                   |
| region       | RegionOne                               |
| region_id    | RegionOne                               |
| service_id   | 023a040a53b44ff69cb9d5d8f210323b        |
| service_name | nova                                    |
| service_type | compute                                 |
| url          | http://controller:8774/v2/%(tenant_id)s |
+--------------+-----------------------------------------+
```
##### 安装nova软件包并配置
1.安装软件包
```
 apt-get install nova-api nova-cert nova-conductor \
   nova-consoleauth nova-novncproxy nova-scheduler \
     python-novaclient
```
2.编辑配置文件/etc/nova/nova.conf 修改以下配置
```
[database]
...
connection = mysql+pymysql://nova:root@controller/nova
[DEFAULT]
...
rpc_backend = rabbit
[oslo_messaging_rabbit]
...
rabbit_host = controller
rabbit_userid = openstack
rabbit_password = root
...
auth_strategy = keystone
...
my_ip = 192.168.2.2
...
network_api_class = nova.network.neutronv2.api.API
security_group_api = neutron
linuxnet_interface_driver = nova.network.linux_net.NeutronLinuxBridgeInterfaceDriver
firewall_driver = nova.virt.firewall.NoopFirewallDriver
...
enabled_apis=osapi_compute,metadata
...
verbose = True
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = nova
password = root
[vnc]
...
vncserver_listen = $my_ip
vncserver_proxyclient_address = $my_ip
[glance]
...
host = controller
[oslo_concurrency]
...
lock_path = /var/lib/nova/tmp
```
3.同步数据库
```
su -s /bin/sh -c "nova-manage db sync" nova
```
4.重启nova服务
```
service nova-api restart
service nova-cert restart
service nova-consoleauth restart
service nova-scheduler restart
service nova-conductor restart
service nova-novncproxy restart
```
### 安装计算节点
1.安装软件包
```
apt-get install nova-compute sysfsutils
```
2.修改配置文件/etc/nova/nova.conf
```
[DEFAULT]
...
rpc_backend = rabbit
...
auth_strategy = keystone
...
my_ip = 192.168.2.2 # compute节点的ip地址
...
network_api_class = nova.network.neutronv2.api.API
security_group_api = neutron
linuxnet_interface_driver = nova.network.linux_net.NeutronLinuxBridgeInterfaceDriver
firewall_driver = nova.virt.firewall.NoopFirewallDriver
...
verbose = True
[oslo_messaging_rabbit]
...
rabbit_host = controller
rabbit_userid = openstack
rabbit_password = root
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = nova
password = root
[vnc]
...
enabled = True
vncserver_listen = 0.0.0.0
vncserver_proxyclient_address = $my_ip
novncproxy_base_url = http://controller:6080/vnc_auto.html
[glance]
...
host = controller
[oslo_concurrency]
...
lock_path = /var/lib/nova/tmp
```
3.验证是否支持虚拟化
```
# 执行以下命令如果返回０则表示不支持
egrep -c '(vmx|svm)' /proc/cpuinfo
# 我们的环境是在虚拟化环境中所以肯定不支持再次虚拟化，所以需要在/etc/nova/nova-compute.conf中做如下配置
[libvirt]
...
virt_type = qemu # 如果支持的话可以设置为kvm
```
4.重启nova compute服务
```
service nova-compute restart
```
### 验证服务
在控制节点执行以下命令
```
# 列出nova所有服务列表
root@controller:~# nova service-list
+----+------------------+------------+----------+---------+-------+----------------------------+-----------------+
| Id | Binary           | Host       | Zone     | Status  | State | Updated_at                 | Disabled Reason |
+----+------------------+------------+----------+---------+-------+----------------------------+-----------------+
| 1  | nova-cert        | controller | internal | enabled | up    | 2016-03-27T11:48:59.000000 | -               |
| 2  | nova-consoleauth | controller | internal | enabled | up    | 2016-03-27T11:48:59.000000 | -               |
| 3  | nova-conductor   | controller | internal | enabled | up    | 2016-03-27T11:48:59.000000 | -               |
| 4  | nova-scheduler   | controller | internal | enabled | up    | 2016-03-27T11:48:59.000000 | -               |
| 5  | nova-compute     | compute    | nova     | enabled | up    | 2016-03-27T11:48:59.000000 | -               |
+----+------------------+------------+----------+---------+-------+----------------------------+-----------------+
# 查看镜像
root@controller:~# nova image-list
+--------------------------------------+--------+--------+--------+
| ID                                   | Name   | Status | Server |
+--------------------------------------+--------+--------+--------+
| 67cfd037-5704-4432-9b2c-cf5fffdb6319 | cirros | ACTIVE |        |
+--------------------------------------+--------+--------+--------+
```
### 安装网络服务neutron
#### 安装控制节点
1.创建neutron数据库并分配相应权限
```
# 创建数据库
CREATE DATABASE neutron;
# 分配访问权限
GRANT ALL PRIVILEGES ON neutron.* TO 'neutron'@'localhost' \
  IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON neutron.* TO 'neutron'@'%' \
  IDENTIFIED BY 'root';
```
2.在keystone中创建neutron服务以及endpoint
```
# 创建neutron用户
root@controller:~# openstack user create --domain default --password-prompt neutron
User Password:
Repeat User Password:
+-----------+----------------------------------+
| Field     | Value                            |
+-----------+----------------------------------+
| domain_id | default                          |
| enabled   | True                             |
| id        | a8edd66b5dc64ce2b2a37cf66546297f |
| name      | neutron                          |
+-----------+----------------------------------+
# 给neutron用户分配admin权限
root@controller:~# openstack role add --project service --user neutron admin
# 创建neutron服务
root@controller:~# openstack service create --name neutron \
   --description "OpenStack Networking" network
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | OpenStack Networking             |
| enabled     | True                             |
| id          | 4a3333006f844469b2ae735014a24ec9 |
| name        | neutron                          |
| type        | network                          |
+-------------+----------------------------------+
# 创建网络服务endpoint
root@controller:~# openstack endpoint create --region RegionOne \
   network public http://controller:9696
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | e7b234ba729b46cbbaa86db2df71e0f2 |
| interface    | public                           |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 4a3333006f844469b2ae735014a24ec9 |
| service_name | neutron                          |
| service_type | network                          |
| url          | http://controller:9696           |
+--------------+----------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   network internal http://controller:9696
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | fadda1557ca846edbeab3f6f8dc79823 |
| interface    | internal                         |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 4a3333006f844469b2ae735014a24ec9 |
| service_name | neutron                          |
| service_type | network                          |
| url          | http://controller:9696           |
+--------------+----------------------------------+
root@controller:~# openstack endpoint create --region RegionOne \
   network admin http://controller:9696
+--------------+----------------------------------+
| Field        | Value                            |
+--------------+----------------------------------+
| enabled      | True                             |
| id           | 3f9866732fd84b70bb14e00fcee597a3 |
| interface    | admin                            |
| region       | RegionOne                        |
| region_id    | RegionOne                        |
| service_id   | 4a3333006f844469b2ae735014a24ec9 |
| service_name | neutron                          |
| service_type | network                          |
| url          | http://controller:9696           |
+--------------+----------------------------------+
```
3.安装neutron软件（根据Self-service网络方式）
```
apt-get install neutron-server neutron-plugin-ml2 \
  neutron-plugin-linuxbridge-agent neutron-l3-agent neutron-dhcp-agent \
    neutron-metadata-agent python-neutronclient conntrack
```
4.修改配置文件/etc/neutron/neutron.conf
```
[database]
...
connection = mysql+pymysql://neutron:root@controller/neutron
[DEFAULT]
...
core_plugin = ml2
service_plugins = router
allow_overlapping_ips = True
...
rpc_backend = rabbit
...
auth_strategy = keystone
...
notify_nova_on_port_status_changes = True
notify_nova_on_port_data_changes = True
nova_url = http://controller:8774/v2
...
verbose = True
[oslo_messaging_rabbit]
...
rabbit_host = controller
rabbit_userid = openstack
rabbit_password = RABBIT_PASS
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = NEUTRON_PASS
[nova]
...
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
region_name = RegionOne
project_name = service
username = nova
password = NOVA_PASS
```
5.修改配置文件/etc/neutron/plugins/ml2/ml2_conf.ini
```
[ml2]
...
type_drivers = flat,vlan,vxlan
...
tenant_network_types = vxlan
...
mechanism_drivers = linuxbridge,l2population
...
extension_drivers = port_security
[ml2_type_flat]
...
flat_networks = public
[ml2_type_vxlan]
...
vni_ranges = 1:1000
[securitygroup]
...
enable_ipset = True
```
6.修改配置文件/etc/neutron/plugins/ml2/linuxbridge_agent.ini
```
[linux_bridge]
physical_interface_mappings = public:eth0
[vxlan]
enable_vxlan = True
local_ip = 192.168.2.2
l2_population = True
[agent]
...
prevent_arp_spoofing = True
[securitygroup]
...
enable_security_group = True
firewall_driver = neutron.agent.linux.iptables_firewall.IptablesFirewallDriver
```
7.修改配置文件/etc/neutron/l3_agent.ini
```
[DEFAULT]
...
interface_driver = neutron.agent.linux.interface.BridgeInterfaceDriver
...
verbose = True
```
8.修改配置文件/etc/neutron/dhcp_agent.ini
```
[DEFAULT]
...
interface_driver = neutron.agent.linux.interface.BridgeInterfaceDriver
dhcp_driver = neutron.agent.linux.dhcp.Dnsmasq
enable_isolated_metadata = True
...
verbose = True
...
dnsmasq_config_file = /etc/neutron/dnsmasq-neutron.conf
# 创建文件/etc/neutron/dnsmasq-neutron.conf并写入如下内容
dhcp-option-force=26,1450
```
9.修改配置文件/etc/neutron/metadata_agent.ini
```
[DEFAULT]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_region = RegionOne
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = root
...
nova_metadata_ip = controller
...
metadata_proxy_shared_secret = root
...
verbose = True
```
10.修改配置文件/etc/nova/nova.conf
```
[neutron]
...
url = http://controller:9696
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
region_name = RegionOne
project_name = service
username = neutron
password = root
service_metadata_proxy = True
metadata_proxy_shared_secret = root
```
11.同步数据库
```
su -s /bin/sh -c "neutron-db-manage --config-file /etc/neutron/neutron.conf \
  --config-file /etc/neutron/plugins/ml2/ml2_conf.ini upgrade head" neutron
```
12.重启服务
```
# 重启nova
service nova-api restart
# 重启neutron
```
#### 安装计算节点
1.安装软件包
```
apt-get install neutron-plugin-linuxbridge-agent conntrack
```
2.修改配置文件/etc/neutron/neutron.conf
```
[DEFAULT]
...
rpc_backend = rabbit
...
auth_strategy = keystone
...
verbose = True
[oslo_messaging_rabbit]
...
rabbit_host = controller
rabbit_userid = openstack
rabbit_password = root
[keystone_authtoken]
...
auth_uri = http://controller:5000
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = root
```
3.修改配置文件/etc/neutron/plugins/ml2/linuxbridge_agent.ini
```
[linux_bridge]
physical_interface_mappings = public:eth0
[vxlan]
enable_vxlan = True
local_ip = 192.168.2.6
l2_population = True
[agent]
...
prevent_arp_spoofing = True
[securitygroup]
...
enable_security_group = True
firewall_driver = neutron.agent.linux.iptables_firewall.IptablesFirewallDriver
```
4.修改配置文件/etc/nova/nova.conf
```
[neutron]
...
url = http://controller:9696
auth_url = http://controller:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
region_name = RegionOne
project_name = service
username = neutron
password = root
```
5.重启服务
```
# 重启nova-compute
service nova-compute restart
# 重启网络服务
service neutron-plugin-linuxbridge-agent restart
```
6.验证
```
# 验证是否成功加载插件
root@controller:~# neutron ext-list
+-----------------------+-----------------------------------------------+
| alias                 | name                                          |
+-----------------------+-----------------------------------------------+
| dns-integration       | DNS Integration                               |
| ext-gw-mode           | Neutron L3 Configurable external gateway mode |
| binding               | Port Binding                                  |
| agent                 | agent                                         |
| subnet_allocation     | Subnet Allocation                             |
| l3_agent_scheduler    | L3 Agent Scheduler                            |
| external-net          | Neutron external network                      |
| flavors               | Neutron Service Flavors                       |
| net-mtu               | Network MTU                                   |
| quotas                | Quota management support                      |
| l3-ha                 | HA Router extension                           |
| provider              | Provider Network                              |
| multi-provider        | Multi Provider Network                        |
| extraroute            | Neutron Extra Route                           |
| router                | Neutron L3 Router                             |
| extra_dhcp_opt        | Neutron Extra DHCP opts                       |
| security-group        | security-group                                |
| dhcp_agent_scheduler  | DHCP Agent Scheduler                          |
| rbac-policies         | RBAC Policies                                 |
| port-security         | Port Security                                 |
| allowed-address-pairs | Allowed Address Pairs                         |
| dvr                   | Distributed Virtual Router                    |
+-----------------------+-----------------------------------------------+
# 验证neutron agents是否正确
root@controller:~# neutron agent-list
+--------------------------------------+--------------------+------------+-------+----------------+---------------------------+
| id                                   | agent_type         | host       | alive | admin_state_up | binary                    |
+--------------------------------------+--------------------+------------+-------+----------------+---------------------------+
| 28e6e70f-063e-433a-943f-ded82ec083fb | Metadata agent     | controller | :-)   | True           | neutron-metadata-agent    |
| 2abdf6a3-f0cd-4a3e-87a3-def58f03aeba | Linux bridge agent | controller | :-)   | True           | neutron-linuxbridge-agent |
| 5e78f457-95f6-4e95-929d-268d35f49037 | DHCP agent         | controller | :-)   | True           | neutron-dhcp-agent        |
| 82c1d9fa-a906-45fc-9a56-56390c8a35fb | L3 agent           | controller | :-)   | True           | neutron-l3-agent          |
| dbbb522e-a424-4606-8a69-77250154e5d3 | Linux bridge agent | compute    | :-)   | True           | neutron-linuxbridge-agent |
+--------------------------------------+--------------------+------------+-------+----------------+---------------------------+
```
### 安装面板服务horizon
1.安装horizon软件包
```
apt-get install openstack-dashboard
```
2.修改配置文件
```
OPENSTACK_HOST = "controller"
ALLOWED_HOSTS = ['*', ]
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
    }
}
OPENSTACK_KEYSTONE_DEFAULT_ROLE = "user"
OPENSTACK_KEYSTONE_MULTIDOMAIN_SUPPORT = True
OPENSTACK_API_VERSIONS = {
    "identity": 3,
    "volume": 2,
}
OPENSTACK_NEUTRON_NETWORK = {
    'enable_router': False,
    'enable_quotas': False,
    'enable_distributed_router': False,
    'enable_ha_router': False,
    'enable_lb': False,
    'enable_firewall': False,
    'enable_vpn': False,
    'enable_fip_topology_check': False,
}
TIME_ZONE = "TIME_ZONE"
```
3.验证面板
```
登入面板测试面板可用性
```
