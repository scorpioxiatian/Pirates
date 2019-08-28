---
title: centos源码安装vim
date: 2019-08-28 17:28:18
categories: Linux
tags: linux
---

# 前言

记录vim源码安装，由于开发环境中系统自带的vim版本旧，以及现有的vim特性无法满足需求。故需要通过手动从源码编译安装vim。以下记录整个无坑安装部署过程。

# 环境准备

操作系统：CentOS Linux release 7.6.1810 (Core)

shell: zsh

# 安装步骤

1. 移除系统自带vim

   ```shell
   yum remove -y vim-filesystem-7.4.160-4.el7.x86_64 vim-common-7.4.160-4.el7.x86_64 vim-enhanced-7.4.160-4.el7.x86_64
   ```

2. 克隆vim源码

   ```shell
   git clone https://github.com/vim/vim.git
   ```

3. 安装vim依赖

   ```shell
   yum install -y ruby ruby-devel lua lua-devel luajit luajit-devel ctags git python python-devel python3 python3-devel tcl-devel perl perl-devel perl-ExtUtils-ParseXS perl-ExtUtils-XSpp perl-ExtUtils-CBuilder perl-ExtUtils-Embed ncurses-devel
   ```

4. 进入vim项目中根据自己需求切换到相应版，并执行如下命令生成Makefile

   ```shell
   ./configure --with-features=huge \
           --enable-multibyte \
           --enable-rubyinterp=yes \
           --enable-python3interp=yes \
           --with-python-config-dir=/usr/lib64/python2.7/config \
           --enable-perlinterp=yes \
           --enable-luainterp=yes \
           --enable-gui=gtk2 \
           --enable-cscope \
           --prefix=/usr/local
   ```

5. 编译文件

   ```shell
   make VIMRUNTIMEDIR=/usr/local/share/vim/vim81
   ```

6. 安装

   ```shell
   make install
   ```
