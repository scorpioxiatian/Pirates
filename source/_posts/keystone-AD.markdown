---
layout: post
title:  "Keystone对接ActiveDirectory"
date:   2016-06-02 09:00:13
categories: openstack
---
keystone对接AD(ActiveDirectory)，本文记录对接配置过程
## 简介
AD，指Windows的Active Directory，是LDAP协议的另一个实现，Keystone也可以和AD进行对接。
## AD服务安装配置
首先我们需要配置好AD，以用来对接keystone。
### 安装AD服务
在window server 中安装AD服务，该过程可参考（https://support.rackspace.com/how-to/installing-active-directory-on-windows-server-2012/）这里不再细说。
### 数据初始化
AD服务安装完成后会生成Users的容器，该容器存放用户的分组以及用户。如下图所示：
![](/images/image2016-5-23-1.png)
当然对于keystone我们也可以使用这种模式，将用户和分组同时都放在容器Users中，但是这样做会显的很乱。一种做法是我们可以单独给用户生成一个类似的容器来存放所有用户信息，也给分组生成一个容器来存放所有分组(当然也可以根据客户现在的账户体系进行规划，这里只做示例用)，如下步骤所示分别建立两个容器来存放用户和分组：
第一步：在根目录ustack下点击新建，容器类型为‘组织单位’
![](/images/image2016-5-23-2.png)
第二步：生成Keystone_Users容器
![](/images/image2016-5-23-3.png)
同样的方式创建容器Keystone_Groups来存放分组，新建完成后如下所示：
![](/images/mage2016-5-23-4.png)
完成之后我们需要在容器Keystone_Users和Keystone_Groups中分别创建用户和分组，示例（在Keystone_Users新建用户）：
进入容器Keystone_Users，右击新建－用户，填上必要的用户信息确认即可，如下图所示
![](/images/image2016-5-23-5.png)
同样的方式可以建立相应的分组，并将用户添加到该分组中。
## keystone的安装和配置
### keysotne安装
keystone安装过程主要是根据社区文档进行安装部署即可，参考：
SUSE: [http://docs.openstack.org/mitaka/install-guide-obs/index.html](http://docs.openstack.org/mitaka/install-guide-obs/index.html) 主要执行以下步骤来安装配置keystone
1. [添加软件源并安装包python-openstackclient](http://docs.openstack.org/mitaka/install-guide-obs/environment-packages.html)
2. [安装数据库](http://docs.openstack.org/mitaka/install-guide-obs/environment-sql-database.html)
3. [安装memcache服务器](http://docs.openstack.org/mitaka/install-guide-obs/environment-memcached.html)
4. [安装keystone](http://docs.openstack.org/mitaka/install-guide-obs/keystone.html)
Ubuntu:[http://docs.openstack.org/mitaka/install-guide-ubuntu/](http://docs.openstack.org/mitaka/install-guide-ubuntu/)
Red Hat Enterprise Linux 7 and CentOS7: [http://docs.openstack.org/mitaka/install-guide-rdo/](http://docs.openstack.org/mitaka/install-guide-rdo/)
### keystone对接AD配置
第一步：source keystone证书文件openrc(v3版本)，该文件内容如下所示：
~~~
root@ldap:~# cat openrc_v3
export OS_PROJECT_DOMAIN_NAME=default
export OS_USER_DOMAIN_NAME=default
export OS_PROJECT_NAME=admin
export OS_USERNAME=admin
export OS_PASSWORD=root
export OS_AUTH_URL=http://127.0.0.1:35357/v3
export OS_IDENTITY_API_VERSION=3
export OS_IMAGE_API_VERSION=2
~~~
第二步：在路径'/etc/keystone/'下创建domains目录，并修改用户权限
~~~
＃　新建目录
mkdir /etc/keystone/domains/
＃　修改权限
chown keystone /etc/keystone/domains/
~~~
第三步：修改配置文件keystone.conf，做如下修改
~~~
# 文件位置　/etc/keystone
[identity]
domain_specific_drivers_enabled = true
domain_config_dir = /etc/keystone/domains
[assignment]
driver = keystone.assignment.backends.sql.Assignment
~~~
第四步：查看AD server的NetBIOS name 作为AD DS的域
~~~
PS C:\> Get-ADDomain | select NetBIOSName
NetBIOSName
-----------
USTACK
~~~
由上所示我们可以看到NetBIOS name 为USTACK
第五步：用openstack命令创建AD 用户域
使用上步骤得到的NetBIOSName作为keystone账户中的域名。
~~~
openstack domain create  USTACK
~~~
第五步：在/etc/keystone/domains/下创建文件keystone.USTACK.conf（注意该文件的命名必须格式keystone.{NetBIOSName}.conf）并做如下配置：
~~~
[ldap]
url = ldap://172.16.10.13
user = cn=chengkun,cn=Users,dc=ustack,dc=test
password = Ustack2016
suffix = dc=ustack,dc=test
user_tree_dn = cn=Users,dc=ustack,dc=test
# user_filter = (memberOf=cn=ustack_admin,OU=UserGroups,DC=ustack,DC=test)
user_objectclass = person
user_id_attribute = sAMAccountName
user_name_attribute = sAMAccountName
user_mail_attribute = mail
user_pass_attribute =
user_enabled_attribute = userAccountControl
user_enabled_mask = 2
user_enabled_default = 512
user_attribute_ignore = password,tenant_id,tenants
user_allow_create = false
user_allow_update = false
user_allow_delete = false
group_tree_dn = OU=UserGroups,DC=ustack,DC=test
# group_tree_dn = cn=Users,dc=ustack,dc=test
group_objectclass = group
group_id_attribute = cn
group_name_attribute = cn
group_allow_create = False
group_allow_update = False
group_allow_delete = False
[identity]
driver = keystone.identity.backends.ldap.Identity
~~~
注意上面配置的用户信息根据实际用户信息填写即可。
修改该文件权限：
~~~
chown keystone /etc/keystone/domains/keystone.LAB.conf
~~~
第六步：给AD账户domain分配权限
~~~
#查看domain id
[root@localhost ~]# openstack domain show USTACK
+---------+----------------------------------+
| Field   | Value                            |
+---------+----------------------------------+
| enabled | True                             |
| id      | 1954d71a8445418482b4d3966e6a8cfe |
| name    | USTACK                           |
+---------+----------------------------------+
#查询admin用户id
[root@localhost ~]# openstack user list --domain default | grep admin
| 8ef5b603ae1344cea4fe060d198d42ad | admin |
#给用户admin在domain USTACK中添加admin的role
openstack role add --domain 1954d71a8445418482b4d3966e6a8cfe --user 8ef5b603ae1344cea4fe060d198d42ad admin
#可以通过以下命令查看是否已经添加上
[root@localhost ~]# openstack role assignment list | grep 1954d71a8445418482b4d3966e6a8cfe | grep 8ef5b603ae1344cea4fe060d198d42ad
| 9d9bb1f3f9e84e999cc18f99fd901398 | 8ef5b603ae1344cea4fe060d198d42ad                                 |                                  |                                  | 1954d71a8445418482b4d3966e6a8cfe |
~~~
第七步：重启keystone服务
~~~
# 注：如果keystone跑在httpd上，直接重启httpd服务即可
systemctl restart openstack-keystone.service
~~~
## 参考资料
* https://docs.hpcloud.com/commercial/GA1/1.1commerical.services-identity-integrate-ldap.html#topic9275__connect
* https://access.redhat.com/documentation/en/red-hat-enterprise-linux-openstack-platform/7/integrate-with-identity-service/chapter-1-active-directory-integration
* https://technet.microsoft.com/en-us/library/ee617195.aspx
* http://windowsitpro.com/powershell/top-10-active-directory-tasks-solved-powershell
