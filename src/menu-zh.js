
/* ===== bruno-i18n-zh: menu localization (appended) ===== */
/* 由 apply 脚本追加到 menu-template.js 末尾。结构无关：在 module.exports
 * 导出后递归遍历菜单项，翻译显式 label，并按 role 给原生项补中文 label。
 * 重复追加时以 BRUNO_I18N_ZH_MENU 标记防止生效两次。 */
(function () {
  if (typeof module === 'undefined' || !module.exports) return;
  if (global.BRUNO_I18N_ZH_MENU) return;
  global.BRUNO_I18N_ZH_MENU = true;

  // 顶层 / 显式 label 翻译
  var labelDict = {
    'Collection': '集合',
    'Open Collection': '打开集合',
    'Open Recent': '最近打开',
    'Clear Recent': '清除最近',
    'Quit': '退出',
    'Force Quit': '强制退出',
    'Edit': '编辑',
    'View': '视图',
    'Window': '窗口',
    'Help': '帮助',
    'Actual Size': '实际大小',
    'Zoom In': '放大',
    'Zoom Out': '缩小',
    'About Bruno': '关于 Bruno',
    'Documentation': '文档',
    'Preferences': '偏好设置',
    'Settings': '设置'
  };

  // 原生 role 项（Electron 默认英文 label）→ 中文
  var roleDict = {
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    pasteAndMatchStyle: '粘贴并匹配样式',
    delete: '删除',
    selectAll: '全选',
    cancel: '取消',
    minimize: '最小化',
    close: '关闭',
    quit: '退出',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    toggledevtools: '切换开发者工具',
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    togglefullscreen: '切换全屏',
    toggleFullScreen: '切换全屏',
    hide: '隐藏',
    hideOthers: '隐藏其他',
    unhide: '全部显示',
    front: '前置全部窗口',
    window: '窗口',
    help: '帮助',
    about: '关于',
    services: '服务',
    recentDocuments: '最近打开',
    clearRecentDocuments: '清除最近'
  };

  function walk(items) {
    if (!Array.isArray(items)) return;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || typeof it !== 'object') continue;
      if (typeof it.label === 'string' && labelDict[it.label]) {
        it.label = labelDict[it.label];
      } else if (it.role && !it.label) {
        var r = roleDict[it.role] || roleDict[String(it.role).toLowerCase()];
        if (r) it.label = r;
      }
      if (it.submenu) walk(it.submenu);
    }
  }

  try { walk(module.exports); } catch (e) { /* never break the menu */ }
})();
