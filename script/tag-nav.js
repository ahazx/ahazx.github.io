/**
 * 标签内「上一篇 / 下一篇」导航
 *
 * 背景：Hexo 的 page.prev / page.next 是全站按日期排序的，没有标签上下文概念。
 * 方案：标签页文章链接带 ?tag=<标签名>；文章页在构建时把本文在每个标签下的
 *       上一篇（更新）/ 下一篇（更旧）算好、以 JSON 内嵌到 #tag-nav-data。
 *       本脚本读取 ?tag= 后重建底部 ul.nav，并把参数继续传递给新链接，
 *       使上下文在连续点击中延续。
 *
 * 降级：任何一步异常（无参数 / 无数据节点 / JSON 解析失败 / 标签不匹配）
 *       都静默返回，保持服务端渲染的全站导航 —— 绝不出现空白导航或抛错。
 */
(function () {
  'use strict';

  /**
   * 构建一个导航项 <li>
   * @param {{url:string,title:string}|null} post 目标文章（null 表示已到边界）
   * @param {string} label 前缀文案，如「上一篇：」
   * @param {string} emptyLabel 边界时的提示文案
   * @param {string} encodedTag 已编码的标签名，用于延续上下文
   * @returns {HTMLLIElement}
   */
  function buildItem(post, label, emptyLabel, encodedTag) {
    var li = document.createElement('li');

    if (!post || !post.url) {
      li.className = 'nav-empty';
      li.appendChild(document.createTextNode(label));
      li.appendChild(document.createTextNode(emptyLabel));
      return li;
    }

    li.appendChild(document.createTextNode(label));
    li.appendChild(document.createTextNode(' '));

    var a = document.createElement('a');
    // 延续标签上下文，否则点一次就会退回全站导航
    a.href = post.url + '?tag=' + encodedTag;
    a.textContent = post.title || '';
    li.appendChild(a);

    return li;
  }

  /** 主流程：命中标签上下文时重建导航 */
  function run() {
    var nav = document.querySelector('.container.post-nav');
    if (!nav) return;

    // 1. 读取 ?tag= —— 无参数直接返回，保持全站导航
    var tag;
    try {
      tag = new URLSearchParams(window.location.search).get('tag');
    } catch (error) {
      return;
    }
    if (!tag) return;

    // 2. 读取并解析内嵌 JSON —— 解析失败静默降级
    var dataNode = document.getElementById('tag-nav-data');
    if (!dataNode) return;

    var map;
    try {
      map = JSON.parse(dataNode.textContent || dataNode.innerHTML);
    } catch (error) {
      return;
    }
    if (!map || typeof map !== 'object') return;

    // 3. 命中当前标签 —— 未命中（如用 ?tag=work 打开一篇 life 文章）静默降级
    var entry = map[tag];
    if (!entry) return;

    var ul = nav.querySelector('ul.nav');
    if (!ul) return;

    // 文案来自服务端 data-* 属性（多语言）
    var labelPrev = nav.getAttribute('data-label-prev') || '';
    var labelNext = nav.getAttribute('data-label-next') || '';
    var labelScope = nav.getAttribute('data-label-scope') || '';
    var labelAll = nav.getAttribute('data-label-all') || '';
    var labelFirst = nav.getAttribute('data-label-first') || '';
    var labelLast = nav.getAttribute('data-label-last') || '';

    var encodedTag = encodeURIComponent(tag);

    // 4. 重建 ul.nav（原内容为服务端渲染的全站导航）
    ul.innerHTML = '';
    ul.appendChild(buildItem(entry.prev, labelPrev, labelFirst, encodedTag));
    ul.appendChild(buildItem(entry.next, labelNext, labelLast, encodedTag));

    // 5. 追加作用域提示：「仅在「life」标签内 · 显示全部」
    var scope = document.createElement('div');
    scope.className = 'nav-scope';

    var hint = document.createElement('span');
    hint.className = 'nav-scope__tag';
    hint.textContent = labelScope.replace('%s', tag);
    scope.appendChild(hint);

    var sep = document.createElement('span');
    sep.className = 'nav-scope__sep';
    sep.textContent = '·';
    scope.appendChild(sep);

    var all = document.createElement('a');
    all.className = 'nav-scope__all';
    all.href = window.location.pathname; // 去掉 ?tag=，回到全站导航
    all.textContent = labelAll;
    scope.appendChild(all);

    nav.appendChild(scope);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
