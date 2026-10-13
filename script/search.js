/**
 * 侧栏站内搜索
 *
 * - 索引 /search.json 由 themes/bear/scripts/search-generator.js 在构建时生成
 * - 首次输入时才懒加载索引，避免每个页面都拉一份
 * - 有搜索词时隐藏侧栏的导航 / 分类 / 目录 / 社交，用结果列表替代
 * - 纯原生 JS，不依赖 jQuery
 */
(function () {
  'use strict';

  var input = document.getElementById('siteSearchInput');
  var sidebar = document.getElementById('sidebar');
  var resultsEl = document.getElementById('siteSearchResults');
  var clearBtn = document.getElementById('siteSearchClear');

  if (!input || !sidebar || !resultsEl) return;

  var indexUrl = input.getAttribute('data-index-url') || '/search.json';
  var emptyText = input.getAttribute('data-empty-text') || 'No results';

  var MAX_RESULTS = 20;
  var DEBOUNCE_MS = 120;

  var indexPromise = null;
  var items = [];
  var timer = null;

  /** 懒加载索引；失败时降级为空索引（搜索返回「没有找到」而不是报错） */
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(indexUrl, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function (data) {
          items = Array.isArray(data) ? data : [];
          return items;
        })
        .catch(function () {
          items = [];
          return items;
        });
    }
    return indexPromise;
  }

  /** 转义后再拼进 innerHTML，避免标题里的特殊字符破坏结构 */
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 标题 / 正文 / 分类名任一命中即算匹配（大小写不敏感） */
  function search(query) {
    var needle = query.toLowerCase();
    var matched = [];
    for (var i = 0; i < items.length && matched.length < MAX_RESULTS; i++) {
      var item = items[i];
      var haystack = [item.title, item.content, (item.tags || []).join(' ')].join(' ').toLowerCase();
      if (haystack.indexOf(needle) !== -1) matched.push(item);
    }
    return matched;
  }

  /** 渲染结果列表；query 为空则复原侧栏 */
  function render(list, query) {
    if (!query) {
      resultsEl.innerHTML = '';
      resultsEl.hidden = true;
      sidebar.classList.remove('sidebar--searching');
      if (clearBtn) clearBtn.hidden = true;
      return;
    }

    sidebar.classList.add('sidebar--searching');
    resultsEl.hidden = false;
    if (clearBtn) clearBtn.hidden = false;

    if (!list.length) {
      resultsEl.innerHTML =
        '<li class="search-result search-result--empty">' + escapeHtml(emptyText) + '</li>';
      return;
    }

    resultsEl.innerHTML = list
      .map(function (item) {
        return (
          '<li class="search-result">' +
            '<a class="search-result__link" href="' + escapeHtml(item.url) + '">' +
              '<span class="search-result__title">' + escapeHtml(item.title) + '</span>' +
              '<span class="search-result__date">' + escapeHtml(item.date) + '</span>' +
            '</a>' +
          '</li>'
        );
      })
      .join('');
  }

  function runQuery() {
    var query = input.value.trim();
    if (!query) {
      render([], '');
      return;
    }
    loadIndex().then(function () {
      // 输入框内容可能在等待索引期间又变了，重新取一次
      var latest = input.value.trim();
      render(latest ? search(latest) : [], latest);
    });
  }

  input.addEventListener('input', function () {
    if (timer) clearTimeout(timer);
    if (!input.value.trim()) {
      render([], '');
      return;
    }
    timer = setTimeout(runQuery, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      input.value = '';
      render([], '');
      input.blur();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      render([], '');
      input.focus();
    });
  }
})();
