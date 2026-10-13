/**
 * 侧栏「目录」年份折叠状态持久化
 *
 * 行为
 * - 用户点开/收起某个年份后，把当前所有展开的年份写入 localStorage
 * - 任意页面加载时把保存的年份还原为展开
 * - 还原期间给 <html> 临时挂 .dir-restoring 类，
 *   配合 site.styl 里的 visibility:hidden 避免「先全部收起再展开」的视觉跳动
 *   （也就是用户反馈的「点击某篇文章的时候目录导航动了一下」）
 *
 * 状态类挂 <html> 而不是 <body>，与侧栏收起逻辑保持一致——
 * layout.pug <head> 里的内联脚本要在首屏绘制前写入，那时 <body> 还没解析。
 */
(function () {
  'use strict';
  var STORAGE_KEY = 'myblog-directory-open';
  var RESTORING_CLASS = 'dir-restoring';
  var root = document.documentElement;

  function readOpenYears() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeOpenYears(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      /* 存储不可用，仅本次会话生效 */
    }
  }

  /** 还原保存的展开状态；还原完再解除隐藏类，避免「闭合→展开」的闪动 */
  function restore() {
    var openYears = readOpenYears();
    if (!openYears.length) {
      // 没有需要还原的年份——首屏内联脚本也没加隐藏类，无需做事
      root.classList.remove(RESTORING_CLASS);
      return;
    }
    var groups = document.querySelectorAll('.sidebar-archives .year-group');
    groups.forEach(function (g) {
      var label = g.querySelector('.year-label');
      if (label && openYears.indexOf(label.textContent) !== -1) {
        g.setAttribute('open', '');
      }
    });
    // 设置 open + 取消隐藏类放在同一个同步任务里，
    // 浏览器下一帧就会把「正确的 open 状态」一次性画出来，不会先画出「全部收起」
    root.classList.remove(RESTORING_CLASS);
  }

  /** 绑定用户点击：每次 toggle 后把当前所有展开的年份写回 localStorage */
  function bind() {
    var groups = document.querySelectorAll('.sidebar-archives .year-group');
    if (!groups.length) return;
    groups.forEach(function (g) {
      g.addEventListener('toggle', function () {
        var open = [];
        document.querySelectorAll('.sidebar-archives .year-group[open]').forEach(function (og) {
          var l = og.querySelector('.year-label');
          if (l) open.push(l.textContent);
        });
        writeOpenYears(open);
      });
    });
  }

  function init() {
    // 先还原再绑定：还原时通过 setAttribute 触发的 toggle 事件
    // 此刻还没有监听器，不会把还原动作当成「用户点击」重复写一次
    restore();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
