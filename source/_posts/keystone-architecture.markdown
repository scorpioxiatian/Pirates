---
layout: post
title:  "keystone架构和功能分析"
date:   2016-04-24 09:00:13
categories: Openstack
tags: keystone
---
## 简介
Keystone(OpenStack Identity Service)是 OpenStack 框架中负责管理身份验证、服务规则和服务令牌功能等的模块。用户访问资源需要验证用户的身份与权限，服务执行操作也需要进行权限检测，这些都需要通过 Keystone 来处理。目前Keystone同时支持V2和V3版本．Keystone V3 版本做出了许多变化和改进，引入了 Domain 和 Group 等新概念．
## keystone基本概念
Keystone 中主要涉及到如下几个概念：User、Project(v3)、Domain、Region、Role、Token。下面对这几个概念进行简要说明。
* User：即使用服务的用户，可以是人、服务或者是系统，只要是使用了 Openstack 服务的对象都可以称为用户。
* Project：项目或者理解为组织拥有的资源的合集。在一个项目中可以拥有很多个用户，这些用户可以根据权限的划分使用项目中的资源。
* Domain: 作用域，即项目的集合，在一个域内可以创建多个项目。
* Region: 作用范围，是域的集合，通过Region来划分区域，Region包括了所有的可用资源。
* Role角色:用于分配操作的权限。角色可以被指定给用户，使得该用户获得角色对应的操作权限。
* Credential 用户证据：用来证明用户身份的证据，可以是用户名和密码、用户名和API key，或者一个 Keystone 分配的身份token。
* Token令牌：指的是一串比特值或者字符串，用来作为访问资源的记号。Token 中含有可访问资源的范围和有效时间。
* Group组：分组可以跟项目或者域建立相应关系．同组的项目可以对项目或者域内享有相应的操作权限。
* Service 服务：一个 OpenStack 服务，比如Nova、Swift或者Glance等。每个服务提供一个或者多个 endpoint 供用户访问资源以及进行操作。
* Endpoint端点 ：一个网络可访问的服务地址，通过它你可以访问一个服务，通常是个 URL 地址。不同 region 有不同的service endpoint。endpoint告诉也可告诉 OpenStack service 去哪里访问特定的 servcie。比如，当 Nova 需要访问 Glance 服务去获取 image 时，Nova 通过访问 Keystone 拿到 Glance 的 endpoint，然后通过访问该 endpoint 去获取Glance服务。我们可以通过Endpoint的 region 属性去定义多个 region。Endpoint 该使用对象分为三类：
    1. adminurl:提供给admin访问
    2. internalurl:该地址是给内部服务之间进行访问
    3. publicurl:公共用户可以访问的地址
* Policy:OpenStack对用户的验证除了 OpenStack 的身份验证以外，还需要鉴别用户对某个服务是否有访问权限。Policy 机制就是用来控制某一个 User 在某个 Tenant 中某个操作的权限。这个 User 能执行什么操作，不能执行什么操作，就是通过 policy 机制来实现的。对于 Keystone 服务来说，policy 就是一个json 文件，默认是 /etc/keystone/policy.json。通过配置这个文件，Keystone Service 实现了对 User 的基于用户角色的权限管理。
## 概念理解
### 账户关系
![](/images/relation_user_project_region.jpg)
从上图中，我们可以看出在一个 RegionOne中包含多个Domain，每个Domain共同使用Region所提供的资源。Domain1中包含 3 个 Projects,可以通过 Group1 将 Role admin直接赋予 Domain,那么 Group1 中的所有用户将会对 Domain1中的所有 Projects 都拥有admin权限。也可以通过 Group2 将 Role demo 只赋予 Project3,这样 Group2 中的 User 就只拥有对Project3有相应的权限，而不会影响其它 Projects。
### 管理对象关系
![](/images/flow_chart.jpg)
从上图我们可以清晰的看到各个对象之间的总体关系，简单的说用户通过用户名密码登入（或者使用联合认证登入），验证成功keystone会返回相应的token(scope_token/unscope_token),scope_token中包含一系列的meta信息（包括端口／角色／项目），每次请求都会先验证token有效性，用户再拿这token去请求相应的资源，服务跟服务之间访问也是通过endpoint找到服务地址并进行请求资源信息，可见token在整个openstaqck家族起到了很重要的作用。另外需要提的是各个服务中的policy机制，policy是根据token中的角色信息来判断用户是否有相应的操作权限。
## 架构
### 整体架构图
![](/images/openstack.jpg)
由上图可知keystone为各个模块提供认证服务，所以各个模块与keystone都有所交互。其中登录认证体现在用户访问各个组件的API时，调用了WSGI框架的authtoken filter，该filter最先调用keystoneclient ，最终通过keystone验证token，完成对用户的登录认证。如果认证失败，用户将不能访问该API。
### keystone架构
#### keystone源码结构
目录结构
```
├── assignment
│   ├── backends
│   ├── controllers.py
│   ├── controllers.pyc
│   ├── core.py
│   ├── core.pyc
│   ├── __init__.py
│   ├── __init__.pyc
│   ├── role_backends
│   ├── routers.py
│   ├── routers.pyc
│   ├── schema.py
│   └── schema.pyc
├── auth
│   ├── controllers.py
│   ├── controllers.pyc
│   ├── core.py
│   ├── core.pyc
│   ├── __init__.py
│   ├── __init__.pyc
│   ├── plugins
│   ├── routers.py
│   └── routers.pyc
├── backends.pyc
├── catalog
│   ├── backends
│   ├── controllers.py
│   ├── controllers.pyc
│   ├── core.py
│   ├── core.pyc
│   ├── __init__.py
│   ├── __init__.pyc
│   ├── routers.py
│   ├── routers.pyc
│   ├── schema.py
│   └── schema.pyc
├── clean.pyc
├── cli.pyc
├── cmd
│   ├── all.py
│   ├── all.pyc
│   ├── cli.py
│   ├── cli.pyc
│   ├── __init__.py
│   ├── __init__.pyc
│   ├── manage.py
│   └── manage.pyc
......
```
1. cmd目录下(主要存放命令行工具)：
    * keystone-all（本地启动服务监听35357和5000端口）
    * keystone-manage（keystone综合管理工具
        a. db_sync:初始化数据库
        b. db_version：打印数据库迁移版本
        c. fernet_rotate：Rotate Fernet encryption keys。
        d. fernet_setup：Setup a key repository for Fernet tokens
        e. mapping_purge:清空mapping表
        f. pki_setup：初始化生成密钥对和证书文件
        g. saml_idp_metadata：生成Identity Provider的metadata
        h. ssl_setup ：为https链接生成密钥对和证书
        i. token_flush ：清除过期token
2. 服务目录：
    * 服务目录如identity,token,catalog等，他们的架构类似都是通过router进行url路由到相应的controller上，controller进行逻辑处理，通过指定的driver调用相应的后台处理。
3. server目录：
    * 服务入口，主要是加载配置启动服务监听相应端口
4. middleware目录：
    * 中间键支持，用于预处理request请求
#### keystone服务启动
*启动方式*
keystone可以通过两种方式启动分别是本地开发模式和部署环境：
本地开发环境：keystone-all --configl-file /etc/keystone/keystone.conf
部署环境：主要是将应用跑在httpd上，可参考配置文档：http://docs.openstack.org/developer/keystone/apache-httpd.html
*启动模式分析*
keystone通过paste deploy组织app，会启动admin(监听35357端口)和main(监听5000端口),对应keystone-paste.ini中的[composite:main]和[composite:admin]，如下所示配置文件：
![](/images/image2016-3-4 16-57-3.png)
从上面配置文件我们可以看出admin应用主要是提供管理员app，main主要提供了公共app。他们同时都支持v2和v3版本api，我们可以看出v3版本的api在admin和main中是没有差异的（在v3版本中都是使用api_v3），但是在v2版本中存在差异，在main用了public_api而在admin中用了admin_api（这就可以解释为何在v2版本中向不同的端口发送相同的请求却返回不同结果）。简单的说在v2版本中还区分admin和public，在v3版本中已经不区分，v3版本中就是按照RBAC即访问控制来决定用户是否对该api有操作权限。
具体的factory构造，包括路由的实现，以及中间件的处理，到最终的应用处理有兴趣可以看看源码的实现，这里就不多说了。
#### keystone RESful Api架构
架构图：
![](/images/RESTFul_API.jpg)
keystone是基于python WSGI框架实现的web应用，通过paste组织web应用服务网络，对外提供REST Api，主要提供了提供 Identity、Token、Catalog 、Resource、Assignment和 Policy 服务：
* Identity服务验证了身份验证凭证，并提供了所有相关的元数据。
* Token服务验证并管理用于验证请求身份的令牌。
* Catalog服务提供了可用于端点发现的服务注册表。
* Policy服务暴露了一个基于规则的身份验证引擎。
* Resource服务提供资源包括project/domain
* Assignment服务分配角色
每个 Keystone 功能都支持用于集成到异构环境并展示不同功能的后端插件。通过下表我们看下各个服务所管理的对象：
```
| 组件名称 | 管理对象 | 类型/格式 | 服务后台 | 配置后台 |
|:-----:|:-----:|:-----:|:-----:|:-----:|
| identity | keystone.identity.controllers.Groupl3 keystone.identity.controllers.UserV3 | -- | ldap/sql | [identity] driver = sql|
| Token | keystone.token.controllers.Auth | uuid/pki/pkiz/fernet | kvs/sql/memcache/memcache_pool | [token] provider = uuid/pki/pkiz/fernet driver = sql/memcache/memcache_pool |
|Catalog  | keystone.catalog.controllers.EndpointV3 keystone.catalog.controllers.RegionV3 keystone.catalog.controllers.ServiceV3 | -- |  kvs/templated/sql | [catalog] driver=sql/kvs/templated |
| Policy | keystone.policy.controllers.PolicyV3 | -- | sql | [policy] driver=sql |
| Resource | keystone.resource.controllers.DomainV3 keystone.resource.controllers.ProjectV3 | -- | ldap/sql | [resource] driver=ldap/sql |
| Assignment | keystone.assignment.controllers.GrantAssignmentV3 keystone.assignment.controllers.ProjectAssignmentV3 keystone.assignment.controllers.TenantAssignment keystone.assignment.controllers.Role keystone.assignment.controllers.RoleAssignmentV2 keystone.assignment.controllers.RoleAssignmentV3 keystone.assignment.controllers.RoleV3 | -- | sql/ldap | [assignment] driver=sql/ldap |
| Authentication | keystone.auth.controllers.Auth | password/saml2/token/oauth1 | -- | [auth] methods=external,password,token,oauth1 password=keystone.auth.plugins.password.Password token=keystone.auth.plugins.token.Token |
```
## 安装配置
### 软件安装
可以通过两种方式安装keystone:
* 源码安装
* 软件包安装
*源码安装（本地环境）*:
```
$ git clone https://git.openstack.org/openstack/keystone.git　#拷贝源码
$ cd keystone/ && virtualenv .venv #进入软件包，创建本地隔离环境
$ source .venv/bin/activate
$ pip install -r requirements.txt　＃安装软件依赖包
$ python setup.py install/develop　＃可以根据需要选择已哪种方式安装，系统安装／开发者模式安装
$ vim /etc/keystone/keystone.conf　＃根据具体需求配置keystone，可参考官方配置文档：http://docs.openstack.org/developer/keystone/configuration.html
# 初始化数据库: keystone-manage --config-file etc/keystone.conf db_sync
```
*软件包安装*:
```
＃Ubuntu
$ sudo apt-get install keystone
# Fedora
$ sudo yum install openstack-keystone
# 配置keystone配置文件keystone.conf
# 初始化数据库: keystone-manage --config-file etc/keystone.conf db_sync
```
### 配置说明
keystone代码的etc/目录下含有keystone的配置文件
* keystone.conf 主要配置文件
* keystone-paste.ini paste配置文件, 可以通过修改此文件增减keystone运行时加载的扩展(contrib).
* default_catalog.templates 定义service catalog的语法文件, 如果keystone的catalog driver 定义为keystone.catalog.backends.templated.Catalog 则会从文本文件中读取endpoint信息(严格注意语法, 空格等), 定义成keystone.catalog.backends.sql.Catalog 则会从数据库中加载endpoint.
* policy.json keystone的接口权限控制定义.
* policy.v3cloudsample.json keystone 官方的多domain部署方式中的权限控制example文件,我们没有使用.
keystone.conf 中主要配置选项说明:
```
[DEFAULT]
   admin_token = ADMIN   # 定义一个超级管理员的token, 使用此token可以绕过权限检查直接操作所有接口, 此参数应该只在安装完keystone后创建初始账户时使用, 生产环境中应该被禁用, 禁用方法为: 在keystone-paste.ini中将所有pipeline中的admin_token_auth这个filter删掉.
debug = False # 打印debug级别的日志
verbose = False  # 打印info级别的日志 ,
   """
   日志级别控制的逻辑为:
    if CONF.debug:
        log_root.setLevel(logging.DEBUG)
    elif CONF.verbose:
        log_root.setLevel(logging.INFO)
    else:
        log_root.setLevel(logging.WARNING)
"""
log_file = /var/log/keystone.log   # 指定将log打到哪个日志文件中, 不设置,日志会打印到屏幕
# 和rabbitmq相关的主要参数
rabbit_host = localhost
rabbit_port = 5672
rabbit_userid = openstack
rabbit_password = testing
rabbit_virtual_host = /
rabbit_ha_queues = True
amqp_durable_queues = True  # 为true的话,所有rabbitmq相关的消息,queue,exchange都会变成持久化的.
control_exchange  = keystone  # keystone 发送的 消息都会发到该 exchange
[auth]
methods = password, token   # 开启的认证方式
password = keystone.auth.plugins.password.Password  # methods中每个定义的认证方法都需要在下方定义
token = keystone.auth.plugins.token.Token
[catalog]
template_file = default_catalog.templates   # 如果driver为templated, 则此选项生效
driver = keystone.catalog.backends.sql.Catalog
[token]
expiration = 3600  # token的过期时间, 按s计算,默认3600s
provider = keystone.token.provider.uuid.Provider  # 使用的token格式, uuid/pki/pkiz/fernet
[database]
connection = mysql://root:root@localhost/keystone  # 定义数据库连接, 如果使用sqlite,则可以修改为sqlite:///keystone.db
[os_inherit]
enabled = True  # 日否开启os_inherit 扩展, 官方对此扩展的说明文档: https://github.com/openstack/identity-api/blob/master/v3/src/markdown/identity-api-v3-os-inherit-ext.md
所有参数的默认值定义都在keystone/common/config.py中
```
## FQA
Ｑ：keystone的35357和5000端口有什么区别?
Ａ：在keystone的 v3 api中35357 和5000 没有任何区别, 建议统一只使用35357端口, 在v2.0的api中, 5000是public api的端口,35357是admin api的端口, 两者提供api的具体差别可以看keystone-paste.ini中的[pipeline:public_api] 和[pipeline:admin_api].
Ｑ：如何开启一个默认未启用的扩展?
Ａ：keystone的扩展,都以filter的形式在keystone-paste.ini中定义, 需要开启只需要将其加入相应的pipeline中,注意的是有些扩展还依赖一些数据库表, 这些表默认安装是不会生成的, 需要用keystone-manage 命令额外初始化.
比如要启用oauth1扩展, 此扩展有自己的数据库表:
oauth1在keystone-paste.ini中的定义为[filter:oauth1_extension], 将其加入[pipeline:api_v3], 顺序最好放在service_v3之前. PS: 有些扩展只支持v2.0 api,有些只支持v3 api,实际情况可以查看它们的实现,比如oauth1: keystone.contrib.oauth1.controllers, 其中所有的controller都是继承自V3Controller, 则此api只能在v3下使用. keystone-manage –config-file etc/keystone.conf db_sync –extension oauth1 接下来即可使用oauth1扩展定义的api了.
## 参考文档
http://docs.openstack.org/developer/keystone/
http://docs.openstack.org/developer/keystone/architecture.html#application-construction
http://docs.openstack.org/developer/keystone/installing.html
http://docs.openstack.org/developer/keystone/developing.html
http://www.ibm.com/developerworks/cn/cloud/library/cl-openstack-keystone/index.html
https://www.ibm.com/developerworks/cn/cloud/library/cl-openstack-pythonapis/
http://www.cnblogs.com/sammyliu/p/4272611.html
http://blog.csdn.net/hzrandd/article/details/10834381
