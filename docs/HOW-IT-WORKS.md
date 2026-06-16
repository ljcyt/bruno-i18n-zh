# 工作原理

## 背景：为什么不能简单地翻译

Bruno 是 Electron + React 应用，界面文本**硬编码**在压缩后的 React 打包文件（`web/static/js/index.<hash>.js`，约 5MB）中，**没有使用任何 i18n 框架**（`i18next` / `react-intl` 等均不存在）。因此可选的思路只有几种，各有问题：

### 方案 A：直接替换打包文件里的英文字符串 ❌
风险极高。这些 UI 字符串与代码逻辑**共用字面量**，例如：

```js
b = u ? "Cancel" : "Send"        // "Send" 是显示文本，应翻译
p = u ? "cancel" : "send"        // "send" 是动作类型，绝不能翻译
switch (x) { case "none": ... }  // "No Auth" 旁边就是 case "none"
```

盲目替换会破坏行为，且打包文件每次发版哈希都变，不可维护。

### 方案 B：preload + contextBridge 拦截 ❌
Bruno 的 `webPreferences` 设了 `contextIsolation: true`，preload 脚本运行在**隔离世界**，无法访问页面的 `Node.prototype`，因而无法拦截 React 的 DOM 写入。

### 方案 C：DOM 替换 + MutationObserver（常见但有缺陷）⚠️
监听 DOM 变化、替换文本节点。问题在于：React 的虚拟 DOM 重渲染会用英文**重新写回**节点；若用 `WeakSet` 记录「已翻译」来防重复，反而导致重渲染后**永久无法再翻译**——界面会还原成英文。这正是很多 DIY 汉化「大部分还是英文」的根因。

---

## 本项目方案：DOM 写入 API 的 setter 层拦截 ✅

`web/index.html` 的 CSP 为 `script-src 'self' 'unsafe-inline'`，允许加载同源脚本。我们在 `index.html` 中、**主应用包之前**插入：

```html
<script defer src="static/js/i18n.js"></script>
```

`defer` 脚本按文档顺序执行，所以 `i18n.js` 会在 React 应用包执行（即首次渲染）**之前**运行，此时它同步安装一组「写入拦截器」：

```js
patchAccessor(Node.prototype,        'textContent', ...)
patchAccessor(Node.prototype,        'nodeValue',   ...)
patchAccessor(CharacterData.prototype,'data',       ...)
Element.prototype.setAttribute = ...            // placeholder / title / aria-label / alt
HTMLInputElement.prototype.placeholder (setter)
document.createTextNode = ...
```

React 通过这些原生接口把文本写进 DOM。每次写入时，拦截器会：

1. 取写入值，`trim()` 后在词典里做**精确查表**（`O(1)`）。
2. 命中则替换为中文（保留原首尾空格）；未命中原样放行。
3. 由于是在**写入时**翻译，React 的每一次重渲染都会再次经过拦截器 → **自动重新翻译**，从根本上消除「被还原」问题，也无闪烁。

### 为什么安全（不破坏功能）

- **只翻译精确整串匹配**的短文本（≤80 字符、无换行），代码标识符 / 动态值几乎不可能整串等于某个 UI 标签。
- **排除编辑器与输入区**：`isExcludedEl()` 向上遍历，命中 `SCRIPT/STYLE/TEXTAREA/INPUT/CODE/PRE`、`contenteditable`、`CodeMirror/cm-editor/cm-content/monaco` 即跳过——绝不污染请求体、脚本、响应内容。
- **不翻译 `value`**：只翻 `placeholder`，避免破坏受控表单 / 提交数据。
- **不读回依赖**：经核查，应用不会把被翻译的 `textContent` / `aria-label` / `title` 读回去做逻辑判断（唯二的 `textContent` 读取点是 CodeMirror 行号——已排除且为数字——和一个非空判断）。
- **异常隔离**：翻译逻辑全程 `try/catch`，任何错误都不会打断宿主的 DOM 写入。

### 兜底

`i18n.js` 还保留了一个 `MutationObserver` + 初始 DOM 遍历，用于覆盖 `innerHTML` 等极少数不经过上述 setter 的路径。它**不使用** 会导致「只翻一次」的 `WeakSet`——翻译是幂等的（中文再查词典无命中，原样返回），可安全重复执行。

---

## 原生菜单

应用菜单是在主进程用 Electron `Menu.buildFromTemplate` 构建的原生菜单，DOM 脚本够不到。`src/menu-zh.js` 被追加到 `src/app/menu-template.js` 末尾，在 `module.exports` 导出后**递归遍历**菜单数组：

- 翻译显式的 `label` 字段；
- 对 `role` 项（`undo`/`copy`/`paste`…，Electron 默认英文）按 `role → 中文` 补 `label`。

这种「导出后处理」与菜单具体结构解耦，跨版本不易失效。

---

## 已知局限

- **拼接句的尾部片段**：JSX 把 `["前缀", {变量}, " 后缀"]` 拆成多个文本节点，词典可命中独立片段，但像 `" open at a time."` 这类裸尾片段未必收录，可能出现中英混排。
- **动态 / 模板字符串**（含变量插值的整句）不做翻译。
- **故意保留英文**：HTTP 方法、`Content-Type` 等头名、快捷键、URL、文件扩展名、纯缩写（JSON/JWT/OAuth）、`getVar()` 等代码标识符。

对一个无 i18n 框架的压缩打包应用而言，运行时字典翻译存在一条无法穷尽的长尾；本项目优先保证**高频可见文本的覆盖**与**零功能风险**。
