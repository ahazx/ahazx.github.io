/**
 * 侧栏「目录」状态持久化：展开的年份 + 侧栏滚动位置
 *
 * 背景
 * - 本站是静态站，每次点文章都是整页重新加载，侧栏（`.sidebar__inner`）会被重建，
 *   它自己的 overflow 滚动位置会被重置为 0 —— 用户反馈的「往下滑点文章时，目录往上跳」就是这个。
 * - 参考 demo 是 SPA，点文章不重建侧栏，所以不会跳；静态站的等价做法就是把这两样状态存起来再还原。
 *
 * 做两件事
 * 1. 展开的年份：写入 localStorage，任意页面加载时还原为展开
 * 2. 侧栏滚动位置：写入 localStorage（不用 sessionStorage —— 这样即使在新标签页打开也能还原），加载时还原
 *
 * 闪动保护
 * - 还原期间给 <html> 临时挂 .dir-restoring 类，配合 site.styl 里的 visibility:hidden，
 *   避免「先全部收起再展开」「先滚到顶再滚下去」两种视觉跳动
 * - 状态类挂 <html> 而不是 <body>，与侧栏收起逻辑保持一致——
 *   layout.pug <head> 里的内联脚本要在首屏绘制前写入，那时 <body> 还没解析
 */
(function () {
  'use strict';
  var OPEN_KEY = 'myblog-directory-open';       // 展开的年份
  var SCROLL_KEY = 'myblog-sidebar-scroll';     // 侧栏滚动位置
  var RESTORING_CLASS = 'dir-restoring';
  var root = document.documentElement;

  // 关掉浏览器自带的滚动还原，避免它在 load 之后把内部滚动容器重置回 0，覆盖我们的还原
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch (e) { /* 忽略 */ }

  function readOpenYears() {
    try {
      var raw = localStorage.getItem(OPEN_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeOpenYears(arr) {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(arr));
    } catch (e) {
      /* 存储不可用，仅本次会话生效 */
    }
  }

  function getScroller() {
    return document.querySelector('.sidebar__inner');
  }

  function readScroll() {
    try {
      var raw = localStorage.getItem(SCROLL_KEY);
      return raw ? parseInt(raw, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  /** 还原侧栏滚动位置；用 auto 保证瞬时定位，不触发平滑动画 */
  function restoreScroll() {
    var sc = getScroller();
    if (!sc) return;
    var top = readScroll();
    if (!top || top <= 0) return;
    if (Math.abs(sc.scrollTop - top) < 1) return; // 已在目标位置，别动
    var prev = sc.style.scrollBehavior;
    sc.style.scrollBehavior = 'auto';
    sc.scrollTop = top;
    sc.style.scrollBehavior = prev;
  }

  /** 还原展开状态 + 滚动位置，最后解除隐藏类 */
  function restore() {
    var openYears = readOpenYears();
    if (openYears.length) {
      var groups = document.querySelectorAll('.sidebar-archives .year-group');
      groups.forEach(function (g) {
        var label = g.querySelector('.year-label');
        if (label && openYears.indexOf(label.textContent) !== -1) {
          g.setAttribute('open', '');
        }
      });
    }
    // 关键顺序：先展开年份（让可滚动高度成立），再还原滚动位置，
    // 最后才解除 visibility 隐藏 —— 三步同一个同步任务里完成，浏览器下一帧一次画对
    restoreScroll();
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

  /** 同步写入侧栏滚动位置（时间节流 120ms，够便宜也够稳，不依赖 rAF 以免卸载阶段丢失） */
  var lastSave = 0;
  var pendingSave = null;
  function saveScrollNow() {
    var sc = getScroller();
    if (!sc) return;
    try {
      localStorage.setItem(SCROLL_KEY, String(sc.scrollTop));
    } catch (e) {
      /* 存储不可用则忽略 */
    }
  }
  function onSidebarScroll() {
    var now = Date.now();
    if (now - lastSave > 120) {
      lastSave = now;
      saveScrollNow();
    } else if (pendingSave === null) {
      // 兜底：节流窗口内的最后一次滚动也要记下来
      pendingSave = setTimeout(function () {
        pendingSave = null;
        lastSave = Date.now();
        saveScrollNow();
      }, 120);
    }
  }

  function bindScroll() {
    var sc = getScroller();
    if (!sc) return;
    sc.addEventListener('scroll', onSidebarScroll, { passive: true });
    // 离开页面前同步补记一次（卸载阶段 rAF 不会执行，所以这里必须同步写）
    window.addEventListener('pagehide', saveScrollNow);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') saveScrollNow();
    });
  }

  function init() {
    // 先还原再绑定：还原时通过 setAttribute 触发的 toggle 事件
    // 此刻还没有监听器，不会把还原动作当成「用户点击」重复写一次
    restore();
    bind();
    bindScroll();
    // 保险：有些浏览器会在 load 之后才最终确定内部滚动容器的位置，load 后再还原一次（幂等）
    window.addEventListener('load', restoreScroll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
