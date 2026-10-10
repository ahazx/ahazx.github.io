/**
 * 侧边栏收起 / 展开
 *
 * - 状态持久化在 localStorage（键 myblog-sidebar-collapsed）
 * - 仅桌面端（≥1024px）生效；窄屏下两个按钮都被 CSS 隐藏
 * - 初始状态由 layout.pug <head> 里的内联脚本提前写到 <html> 上，避免首屏闪动
 * - 状态类挂在 <html> 而非 <body>，因为内联脚本执行时 <body> 尚未解析
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'myblog-sidebar-collapsed';
  var COLLAPSED_CLASS = 'sidebar-collapsed';
  var root = document.documentElement;

  /**
   * 写入收起状态到 localStorage，失败时静默忽略
   * （隐私模式 / 禁用存储等场景下 localStorage 会抛异常）
   * @param {boolean} collapsed
   */
  function persist(collapsed) {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch (error) {
      /* 存储不可用，仅本次会话生效 */
    }
  }

  /**
   * 切换收起状态
   * @param {boolean} collapsed
   */
  function setCollapsed(collapsed) {
    if (collapsed) {
      root.classList.add(COLLAPSED_CLASS);
    } else {
      root.classList.remove(COLLAPSED_CLASS);
    }
    persist(collapsed);
  }

  /** 绑定收起 / 展开按钮 */
  function bind() {
    var toggle = document.getElementById('sidebarToggle');
    var reopen = document.getElementById('sidebarReopen');

    if (toggle) {
      toggle.addEventListener('click', function () {
        setCollapsed(true);
      });
    }

    if (reopen) {
      reopen.addEventListener('click', function () {
        setCollapsed(false);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
