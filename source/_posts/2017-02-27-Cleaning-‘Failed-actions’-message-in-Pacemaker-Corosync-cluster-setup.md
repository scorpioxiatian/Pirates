---
title: Cleaning ‘Failed actions’ message in Pacemaker/Corosync cluster setup
date: 2017-02-27 18:10:18
categories: Soft
tags: Pacemaker
---

Sometimes when using [Pacemaker](http://www.clusterlabs.org/)/[Corosync](http://www.corosync.org/doku.php?id=welcome)-based cluster you can see warning message in **crm_mon** output:

> Failed actions:
> drbd_mysql:0_promote_0 (node=node2.cluster.org, call=11, rc=-2, status=Timed Out): unknown exec error

﻿

To clean it up you can use command **crm_resource** which checks health of resources:

> [root@node1 ~]# crm_resource -P
> Waiting for 1 replies from the CRMd. OK
> [root@node1 ~]#

To check cluster’s status run **crm_mon **again, warning message should be gone.