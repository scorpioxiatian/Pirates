---
layout: post
title:  "jekyll 常用变量"
date:   2016-07-22 09:00:13
categories: jekyll
---
## 常用变量
Jekyll 会遍历你的网站搜寻要处理的文件。任何有 YAML 头信息的文件都是要处理的对象。对于每一个这样的文件，Jekyll 都会通过 Liquid 模板工具来生成一系列的数据。下面就是这些可用数据变量的参考和文档。
### 全局(Global)变量
|变量|说明|
|:---------:|:---------------------------------------------------:|
|site|来自_config.yml文件，全站范围的信息+配置。详细的信息请参考下文|
|page|页面专属的信息 + YAML 头文件信息。通过 YAML 头文件自定义的信息都可以在这里被获取。详情请参考下文。|
|content|被 layout 包裹的那些 Post 或者 Page 渲染生成的内容。但是又没定义在 Post 或者 Page 文件中的变量。|
|paginator|每当 paginate 配置选项被设置了的时候，这个变量就可用了。详情请看[分页](http://jekyllcn.com/docs/pagination/)。|
### 全站(site)变量
|变量|说明|
|:---------:|:---------------------------------------------------:|
|site.time|当前时间（运行jekyll这个命令的时间点）。|
|site.pages|所有 Pages 的清单。|
|site.posts|一个按照时间倒序的所有 Posts 的清单。|
|site.related_posts|如果当前被处理的页面是一个 Post，这个变量就会包含最多10个相关的 Post。默认的情况下，相关性是低质量的，但是能被很快的计算出来。如果你需要高相关性，就要消耗更多的时间来计算。用 jekyll 这个命令带上 --lsi (latent semantic indexing) 选项来计算高相关性的 Post。注意，GitHub 在生成站点时不支持　lsi。|
|site.static_files|静态文件的列表 (此外的文件不会被 Jekyll 和 Liquid 处理。)。每个文件都具有三个属性： path， modified_time 以及 extname。|
|site.html_pages|‘site.pages’的子集，存储以‘.html’结尾的部分。|
|site.html_files|‘site.static_files’的子集，存储以‘.html’结尾的部分。|
|site.collections|一个所有集合（collection）的清单。|
|site.data|一个存储了 _data 目录下的YAML文件数据的清单。|
|site.documents|每一个集合（collection）中的全部文件的清单。|
|site.categories.CATEGORY|所有的在 CATEGORY 类别下的帖子。|
|site.tags.TAG|所有的在 TAG 标签下的帖子。|
|site.[CONFIGURATION_DATA]|所有的通过命令行和 _config.yml 设置的变量都会存到这个 site 里面。 举例来说，如果你设置了 url: http://mysite.com 在你的配置文件中，那么在你的 Posts 和 Pages 里面，这个变量就被存储在了 site.url。Jekyll 并不会把对 _config.yml 做的改动放到 watch 模式，所以你每次都要重启 Jekyll 来让你的变动生效。|
### 页面(page)变量
|变量|说明|
|:---------:|:---------------------------------------------------:|
|page.content|页面内容的源码。|
|page.title|页面的标题。|
|page.excerpt|页面摘要的源码。|
|page.url|帖子以斜线打头的相对路径，例子： /2008/12/14/my-post.html。|
|page.date|帖子的日期。日期的可以在帖子的头信息中通过用以下格式 YYYY-MM-DD HH:MM:SS (假设是 UTC), 或者 YYYY-MM-DD HH:MM:SS +/-TTTT ( 用于声明不同于 UTC 的时区， 比如 2008-12-14 10:30:00 +0900) 来显示声明其他 日期/时间 的方式被改写，|
|page.id|帖子的唯一标识码（在RSS源里非常有用），比如 /2008/12/14/my-post|
|page.categories|i这个帖子所属的 Categories。Categories 是从这个帖子的 _posts 以上 的目录结构中提取的。举例来说, 一个在 /work/code/_posts/2008-12-24-closures.md 目录下的 Post，这个属性就会被设置成 ['work', 'code']。不过 Categories 也能在 YAML 头文件信息 中被设置。|
|page.tags|i这个 Post 所属的所有 tags。Tags 是在YAML 头文件信息中被定义的。|
|page.path|Post 或者 Page 的源文件地址。举例来说，一个页面在 GitHub 上的源文件地址。 这可以在 YAML 头文件信息 中被改写。|
|page.next|当前文章在site.posts中的位置对应的下一篇文章。若当前文章为最后一篇文章，返回nil|
|page.previous|当前文章在site.posts中的位置对应的上一篇文章。若当前文章为第一篇文章，返回nil|
> **提示™: 使用自定义的头信息**
>> 任何你自定义的头文件信息都会在 page 中可用。 举例来说，如果你在一个 Page 的头文件中设置了 custom_css: true， 这个变量就可以这样被取到 page.custom_css。
### 分页器(Paginator)
|变量|说明|
|:---------:|:---------------------------------------------------:|
|paginator.per_page|每一页 Posts 的数量。|
|paginator.posts|这一页可用的 Posts。|
|paginator.total_posts|Posts 的总数。|
|paginator.total_pages|Pages 的总数。|
|paginator.page|当前页号。|
|paginator.previous_page|前一页的页号。|
|paginator.previous_page_path|前一页的地址。|
|paginator.next_page|下一页的页号。|
|paginator.next_page_path|下一页的地址。|
> **分页器变量的可用性**
>> 这些变量仅在首页文件中可用，不过他们也会存在于子目录中，就像 /blog/index.html。
本文转自：[http://jekyllcn.com/docs/variables/](http://jekyllcn.com/docs/variables/)
仅供学习使用.
