# 实现说明

## 背景

Bruno 是基于 Electron 与 React 的桌面应用，界面文本以硬编码形式存在于打包后的 `web/static/js/index.<hash>.js`（约 5 MB）中，未使用任何 i18n 框架（`i18next`、`react-intl` 等均不存在）。在此前提下，可选方案有限，下面说明各方案为何大多不适用。

**直接替换打包文件中的英文字符串。** 风险较高，因为界面文本常与逻辑共用同一字面量：

```js
b = u ? "Cancel" : "Send"        // "Send" 为按钮文本，需翻译
p = u ? "cancel" : "send"        // "send" 为动作类型，不可替换
switch (x) { case "none": ... }  // "No Auth" 与 case "none" 相邻
```

直接替换会破坏行为，且文件名包含内容哈希，每次发版均会变化，不利于维护。

**preload + contextBridge 拦截。** Bruno 启用了 `contextIsolation: true`，preload 运行于隔离上下文，无法访问页面的 `Node.prototype`，因而无法拦截 React 的 DOM 写入。

**监听 DOM 后替换（MutationObserver）。** 可行，但存在缺陷：React 重渲染会以英文重新写入节点；若以 `WeakSet` 记录"已翻译"来避免重复，则重渲染后将无法再次翻译，界面退回英文。这是不少自制汉化"安装后仍大量保留英文"的根本原因。

## 采用的方案：拦截 DOM 写入

`web/index.html` 的 CSP 为 `script-src 'self' 'unsafe-inline'`，允许加载同源脚本。补丁在 `index.html` 中、主应用包之前插入一行：

```html
<script defer src="static/js/i18n.js"></script>
```

`defer` 脚本按文档顺序执行，因此 `i18n.js` 会在 React 应用包执行（即首次渲染）之前运行，并在执行时同步安装一组写入拦截器：

```js
patchAccessor(Node.prototype,         'textContent', ...)
patchAccessor(Node.prototype,         'nodeValue',   ...)
patchAccessor(CharacterData.prototype,'data',        ...)
Element.prototype.setAttribute = ...        // placeholder / title / aria-label / alt
HTMLInputElement.prototype.placeholder      // setter
document.createTextNode = ...
```

React 即通过这些原生接口将文本写入 DOM。每次写入时，拦截器取得写入值，`trim()` 后在词典中进行精确查表（`O(1)`），命中则替换为中文并保留首尾空格，未命中则原样放行。

关键在于这是写入时翻译：React 每次重渲染都会再次经过拦截器，从而自动重新翻译，不会被还原，也不产生闪烁。

## 功能安全性

- 仅翻译精确整串匹配的短文本（≤ 80 字符、无换行）。代码标识符与动态值几乎不可能整串等于某个界面标签。
- 跳过编辑器与输入区域：`isExcludedEl()` 向上遍历父节点，遇到 `SCRIPT / STYLE / TEXTAREA / INPUT / CODE / PRE`、`contenteditable`、`CodeMirror / cm-editor / cm-content / monaco` 即不翻译，因此不影响请求体、脚本与响应内容。
- 不翻译 `value`，仅翻译 `placeholder`，避免破坏受控表单与提交数据。
- 不依赖读回：经核查，Bruno 不会将翻译后的 `textContent`、`aria-label`、`title` 读回用于逻辑判断（仅有的两处 `textContent` 读取，一处为 CodeMirror 行号——已排除且为数字，一处仅判断是否为空）。
- 翻译逻辑整体置于 `try/catch` 中，异常不会中断宿主的 DOM 写入。

此外保留了一个 `MutationObserver` 与初始遍历作为兜底，用于覆盖 `innerHTML` 等少数不经过上述 setter 的路径。该兜底不使用会导致"仅翻译一次"的 `WeakSet`——翻译具有幂等性（中文再次查词典不命中，原样返回），重复执行无副作用。

## 菜单本地化

应用菜单由主进程通过 Electron `Menu.buildFromTemplate` 构建，属原生菜单，DOM 脚本无法访问。`src/menu-zh.js` 被追加至 `menu-template.js` 末尾，在 `module.exports` 导出后递归遍历菜单数组：翻译显式 `label`，并对 `role` 项（`undo` / `copy` / `paste` 等，Electron 默认为英文）补充中文 `label`。该"导出后处理"方式与菜单具体结构解耦，跨版本不易失效。

## 已知局限

- **拼接句的尾部片段。** JSX 将 `["前缀", {变量}, " 后缀"]` 拆分为多个文本节点，词典可命中独立片段，但 `" open at a time."` 一类零散尾部未必收录，可能出现中英混排。
- **含变量插值的整句** 不做翻译。
- **保留英文的内容**：HTTP 方法、`Content-Type` 等头名、快捷键、URL、文件扩展名、纯缩写（JSON / JWT / OAuth）、`getVar()` 等代码标识符。

对于未使用 i18n 框架的压缩打包应用，运行时字典翻译存在一条无法穷尽的长尾。本项目优先保证高频可见文本的覆盖与功能零风险。
