---
title: openstack——云硬盘的备份与恢复
date: 2017-09-22 14:51:35
tags: [openstack, cinder]
---

本文会讲述如何进行跨平台云硬盘的备份与恢复，cinder提供的backup功能目前支持多种后端driver备份，比如：nfs、swift、ceph、tsm等等，可见目前常见的存储后端都是支持的。cinder在很早就已经支持备份，主要有以下优势：

1. 重要数据及时备份
2. 异地容灾备份（基于cinder备份功能独立的后端driver实现）
3. openstack集群升级与迁移（冷迁移）

下文增对openstack集群迁移来讲解，使用cinder backup来实现数据跨集群备份与恢复。

# 总体思路

以下主要概括备份与恢复大概思路。

在openstack集群A中做如下操作：

1. 配置cinder的backup使用ceph作为后端driver
2. 创建云盘备份
3. 导出云盘备份的metadata

在openstack集群B中做如下操作：

1. 配置cinder的backup使用ceph作为后端driver
2. 导入云盘的metadata信息
3. 创建新的云硬盘，大小与原云盘一致
4. 将备份从ceph存储中恢复到新建的云硬盘中

# 操作步骤

前期准备：

- [x] openstack集群两套（也可一套仅仅做云盘备份用）
- [x] 一套ceph集群专门用作云盘备份

## 创建云盘备份

首先将ceph集群中的配置文件以及认证文件拷贝到cinder所在节点的/etc/ceph目录下并重命名（防止与原来的ceph配置重叠）：

```python
scp /etc/ceph/ceph.conf root@cinder_host_addr:/etc/ceph/ceph-backup.conf
scp /etc/ceph/ceph.client.admin.keyring root@cinder_host_addr:/etc/ceph/ceph.client.cinder-backup.keyring
```

在两套集群中cinder所在节点修改ceph-backup.conf文件，在【global】分组中添加如下配置（**important**）：

```python
keyring = /etc/ceph/ceph.client.cinder-backup.keyring
```

在两套集群中配置cinder的backup后端driver，如下所示：

```python
backup_driver=cinder.backup.drivers.ceph
backup_ceph_conf=/etc/ceph/ceph-backup.conf
backup_ceph_user=admin
backup_ceph_chunk_size=134217728
backup_ceph_pool=sata-00 # 存储pool根据实际ceph中规划的pool填写

```

重启cinder-backup服务：

```python
systemctl restart openstack-cinder-backup
```

在集群A中创建volume备份：

> 注意备份云盘前需将云盘从云主机中解绑才行

```python
cinder backup-create 0c7006e8-4c01-4bdb-b4b2-6be5336263d0 # volume ID
```

等待几秒查看备份是否成功，状态为available即表示创建成功：

```python
[root@controller ~]# cinder backup-show 46fc9fc6-d783-4dd3-8096-839e21c49c68
+-----------------------+--------------------------------------+
|        Property       |                Value                 |
+-----------------------+--------------------------------------+
|   availability_zone   |                 nova                 |
|       container       |               sata-00                |
|       created_at      |      2017-09-23T06:22:21.000000      |
|      description      |                 None                 |
|      fail_reason      |                 None                 |
| has_dependent_backups |                False                 |
|           id          | 46fc9fc6-d783-4dd3-8096-839e21c49c68 |
|     is_incremental    |                False                 |
|          name         |                 None                 |
|      object_count     |                  0                   |
|          size         |                  10                  |
|         status        |              available               |
|       volume_id       | 0c7006e8-4c01-4bdb-b4b2-6be5336263d0 |
+-----------------------+--------------------------------------+
```

查看ceph集群中是否已经有该云盘备份：

```python
[root@server-17 ~]# rbd -p sata-00 ls | grep 0c7006e8-4c01-4bdb-b4b2-6be5336263d0
volume-0c7006e8-4c01-4bdb-b4b2-6be5336263d0.backup.base
```

至此云盘备份已经完成。

## 导出云盘backup的metadata

> 目前openstackclient命令暂不支持backup-export命令，社区已经有提出并提交了代码来支持:https://review.openstack.org/#/c/497167/

下面我们需要将集群A中的云盘本分的metadata信息导出，执行如下命令：

```python
[root@controller ~]# cinder backup-export 46fc9fc6-d783-4dd3-8096-839e21c49c68
+----------------+------------------------------------------------------------------------------+
|    Property    |                                    Value                                     |
+----------------+------------------------------------------------------------------------------+
| backup_service |                          cinder.backup.drivers.ceph                          |
|   backup_url   | eyJzdGF0dXMiOiAiYXZhaWxhYmxlIiwgImRpc3BsYXlfbmFtZSI6IG51bGwsICJhdmFpbGFiaWxp |
|                | dHlfem9uZSI6ICJub3ZhIiwgImRlbGV0ZWQiOiBmYWxzZSwgInVwZGF0ZWRfYXQiOiAiMjAxNy0w |
|                | OS0yM1QwNjoyMjozOFoiLCAiaG9zdCI6ICJjaW5kZXIiLCAidm9sdW1lX2lkIjogIjBjNzAwNmU4 |
|                | LTRjMDEtNGJkYi1iNGIyLTZiZTUzMzYyNjNkMCIsICJjb250YWluZXIiOiAic2F0YS0wMCIsICJz |
|                | ZXJ2aWNlX21ldGFkYXRhIjogbnVsbCwgImlkIjogIjQ2ZmM5ZmM2LWQ3ODMtNGRkMy04MDk2LTgz |
|                | OWUyMWM0OWM2OCIsICJzaXplIjogMTAsICJvYmplY3RfY291bnQiOiAwLCAicHJvamVjdF9pZCI6 |
|                | ICI2NWZlNzg2NTY3YTM0MTgyOWFhMDU3NTFiMmI3MzYwZiIsICJkZWxldGVkX2F0IjogbnVsbCwg |
|                | InVzZXJfaWQiOiAib3BlbnN0YWNrX2FkbWluIiwgInNlcnZpY2UiOiAiY2luZGVyLmJhY2t1cC5k |
|                | cml2ZXJzLmNlcGgiLCAiZHJpdmVyX2luZm8iOiB7fSwgImNyZWF0ZWRfYXQiOiAiMjAxNy0wOS0y |
|                | M1QwNjoyMjoyMVoiLCAiZGlzcGxheV9kZXNjcmlwdGlvbiI6IG51bGwsICJwYXJlbnRfaWQiOiBu |
|                | dWxsLCAibnVtX2RlcGVuZGVudF9iYWNrdXBzIjogMCwgImZhaWxfcmVhc29uIjogbnVsbCwgInRl |
|                |       bXBfc25hcHNob3RfaWQiOiBudWxsLCAidGVtcF92b2x1bWVfaWQiOiBudWxsfQ==       |
|                |                                                                              |
+----------------+------------------------------------------------------------------------------+
```

其中backup_url就是我们所需要的metadata信息，这一串东西就是metadata经过base64过后的字符，我们用base64进行解码后就能得到如下信息：

```
{"status": "available", "display_name": null, "availability_zone": "nova", "deleted": false, "updated_at": "2017-09-23T06:22:38Z", "host": "cinder", "volume_id": "0c7006e8-4c01-4bdb-b4b2-6be5336263d0", "container": "sata-00", "service_metadata": null, "id": "46fc9fc6-d783-4dd3-8096-839e21c49c68", "size": 10, "object_count": 0, "project_id": "65fe786567a341829aa05751b2b7360f", "deleted_at": null, "user_id": "75fc9fc6-d783-4dd3-8096-839e21c49c68", "service": "cinder.backup.drivers.ceph", "driver_info": {}, "created_at": "2017-09-23T06:22:21Z", "display_description": null, "parent_id": null, "num_dependent_backups": 0, "fail_reason": null, "temp_snapshot_id": null, "temp_volume_id": null}
```

可以用如下命令得到backup_url:

```python
[root@controller ~]# cinder backup-export 46fc9fc6-d783-4dd3-8096-839e21c49c68 |  sed -n '/backup_url/,$ s/|.*|  *\(.*\) |/\1/p'
eyJzdGF0dXMiOiAiYXZhaWxhYmxlIiwgImRpc3BsYXlfbmFtZSI6IG51bGwsICJhdmFpbGFiaWxp
dHlfem9uZSI6ICJub3ZhIiwgImRlbGV0ZWQiOiBmYWxzZSwgInVwZGF0ZWRfYXQiOiAiMjAxNy0w
OS0yM1QwNjoyMjozOFoiLCAiaG9zdCI6ICJjaW5kZXIiLCAidm9sdW1lX2lkIjogIjBjNzAwNmU4
LTRjMDEtNGJkYi1iNGIyLTZiZTUzMzYyNjNkMCIsICJjb250YWluZXIiOiAic2F0YS0wMCIsICJz
ZXJ2aWNlX21ldGFkYXRhIjogbnVsbCwgImlkIjogIjQ2ZmM5ZmM2LWQ3ODMtNGRkMy04MDk2LTgz
OWUyMWM0OWM2OCIsICJzaXplIjogMTAsICJvYmplY3RfY291bnQiOiAwLCAicHJvamVjdF9pZCI6
ICI2NWZlNzg2NTY3YTM0MTgyOWFhMDU3NTFiMmI3MzYwZiIsICJkZWxldGVkX2F0IjogbnVsbCwg
InVzZXJfaWQiOiAib3BlbnN0YWNrX2FkbWluIiwgInNlcnZpY2UiOiAiY2luZGVyLmJhY2t1cC5k
cml2ZXJzLmNlcGgiLCAiZHJpdmVyX2luZm8iOiB7fSwgImNyZWF0ZWRfYXQiOiAiMjAxNy0wOS0y
M1QwNjoyMjoyMVoiLCAiZGlzcGxheV9kZXNjcmlwdGlvbiI6IG51bGwsICJwYXJlbnRfaWQiOiBu
dWxsLCAibnVtX2RlcGVuZGVudF9iYWNrdXBzIjogMCwgImZhaWxfcmVhc29uIjogbnVsbCwgInRl
bXBfc25hcHNob3RfaWQiOiBudWxsLCAidGVtcF92b2x1bWVfaWQiOiBudWxsfQ==
```

## 导入云盘backup的metadata

根据上面步骤得到的backup_url，我将将其写到metadata.txt文件中，然后再集群B中导入该metadata信息，操作步骤如下所示：

```
cinder backup-import cinder.backup.drivers.ceph $(tr -d '\n' < metadata.txt)
+----------+--------------------------------------+
| Property |                Value                 |
+----------+--------------------------------------+
|    id    | b238d4b5-e757-4d8f-5623-3d982e5616dc |
|   name   |                 None                 |
+----------+--------------------------------------+
```

导入成功后我们能用cinder backup-list看到新导入的metadata信息。

## 创建新的云硬盘

在集群B中创建一个新的云硬盘，磁盘大小跟原来的一样，执行如下命令创建：

```python
[root@controller ~]# cinder create --display_name backup_recover 10
+---------------------------------------+--------------------------------------+
|                Property               |                Value                 |
+---------------------------------------+--------------------------------------+
|              attachments              |                  []                  |
|           availability_zone           |                 nova                 |
|                bootable               |                false                 |
|          consistencygroup_id          |                 None                 |
|               created_at              |      2017-09-23T06:53:13.000000      |
|              description              |                 None                 |
|               encrypted               |                False                 |
|                   id                  | d0431cee-3de2-458f-a70d-95935d7ffd9f |
|                metadata               |                  {}                  |
|            migration_status           |                 None                 |
|              multiattach              |                False                 |
|                  name                 |            backup_recover            |
|         os-vol-host-attr:host         |         cinder@ssd-ceph#ssd          |
|     os-vol-mig-status-attr:migstat    |                 None                 |
|     os-vol-mig-status-attr:name_id    |                 None                 |
|      os-vol-tenant-attr:tenant_id     |   65fe786567a341829aa05751b2b7360f   |
```

## 云盘恢复

现在需要将原来的云盘的备份恢复到新建的云硬盘中，我们需要在集群B的cinder节点执行如下恢复操作：

```
[root@controller ~]# cinder backup-restore --volume d0431cee-3de2-458f-a70d-95935d7ffd9f b238d4b5-e757-4d8f-5623-3d982e5616dc
+-------------+--------------------------------------+
|   Property  |                Value                 |
+-------------+--------------------------------------+
|  backup_id  | b238d4b5-e757-4d8f-5623-3d982e5616dc |
|  volume_id  | d0431cee-3de2-458f-a70d-95935d7ffd9f |
| volume_name |            backup_recover            |
+-------------+--------------------------------------+
```

恢复成功后backup的状态会从restoring变为available，到此表示恢复完成，我们需要做的就是将恢复完成的云盘挂载到云主机中，来查看数据是否已经恢复。THE END。。。。。

