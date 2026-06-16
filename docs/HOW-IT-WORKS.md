# 原理

## 出发点

Bruno 是 Electron + React 应用，界面文本硬编码在打包后的 `web/static/js/index.<hash>.js`（约 5MB）里，没有用任何 i18n 框架（`i18next`、`react-intl` 之类都不存在）。所以能选的路不多，挨个说一下为什么大多不行。

**直接替换打包文件里的英文字符串。** 风险太大，因为 UI 文本和逻辑经常共用同一个字面量：

```js
b = u ? "Cancel" : "Send"        // "Send" 是按钮文字，要翻
p = u ? "cancel" : "send"        // "send" 是动作类型，不能动
switch (x) { case "none": ... }  // "No Auth" 旁边就是 case "none"
```

盲改会破坏行为，而且文件名带内容哈希，每次发版都变，没法维护。

**preload + contextBridge 拦截。** Bruno 开了 `contextIsolation: true`，preload 跑在隔离世界里，碰不到页面的 `Node.prototype`，拦不住 React 的 DOM 写入。

**监听 DOM 再替换（MutationObserver）。** 能跑，但有个坑：React 重渲染会用英文把节点重新写一遍；如果用 `WeakSet` 记「已翻译」来防重复，重渲染之后反而永远不会再翻——界面就退回英文了。很多手搓汉化「装了还是大半英文」就是栽在这。

## 实际做法：拦 DOM 写入

`web/index.html` 的 CSP 是 `script-src 'self' 'unsafe-inline'`，允许加载同源脚本。我们在 `index.html` 里、主应用包**之前**插一行：

```html
<script defer src="static/js/i18n.js"></script>
```

`defer` 脚本按顺序执行，所以 `i18n.js` 会赶在 React 应用包跑起来（也就是首次渲染）之前执行。它一执行就同步挂上一组写入拦截器：

```js
patchAccessor(Node.prototype,         'textContent', ...)
patchAccessor(Node.prototype,         'nodeValue',   ...)
patchAccessor(CharacterData.prototype,'data',        ...)
Element.prototype.setAttribute = ...        // placeholder / title / aria-label / alt
HTMLInputElement.prototype.placeholder      // setter
document.createTextNode = ...
```

React 就是通过这些原生接口把文本写进 DOM 的。每次写的时候，拦截器拿到值，`trim()` 后到词典里精确查一下（`O(1)`），命中就换成中文并保留首尾空格，没命中就原样放行。

关键在于这是「写入时」翻译——React 每次重渲染都会再经过拦截器，于是自动重翻，不会被还原，也不闪。

## 为什么不会弄坏功能

- 只翻**精确整串匹配**的短文本（≤80 字符、无换行）。代码标识符、动态值几乎不可能整串等于某个 UI 标签。
- 跳过编辑器和输入区：`isExcludedEl()` 往上找父节点，遇到 `SCRIPT / STYLE / TEXTAREA / INPUT / CODE / PRE`、`contenteditable`、`CodeMirror / cm-editor / cm-content / monaco` 就不翻——不会动请求体、脚本、响应。
- 不翻 `value`，只翻 `placeholder`，避免破坏受控表单和提交的数据。
- 不依赖读回：查过 Bruno 的代码，它不会把翻译过的 `textContent` / `aria-label` / `title` 读回去做判断（仅有的两处 `textContent` 读取，一处是 CodeMirror 行号——已排除且是数字，一处只判断非空）。
- 翻译逻辑整个包在 `try/catch` 里，出错也不会打断原本的 DOM 写入。

另外还留了个 `MutationObserver` 加初始遍历兜底，应付 `innerHTML` 这种少数不走上面 setter 的路径。它不用那个会「只翻一次」的 `WeakSet`——翻译是幂等的（中文再查词典查不到，原样返回），重复跑没问题。

## 菜单

应用菜单是主进程用 Electron `Menu.buildFromTemplate` 建的原生菜单，DOM 脚本够不着。`src/menu-zh.js` 被追加到 `menu-template.js` 末尾，在 `module.exports` 导出后递归遍历菜单数组：翻显式的 `label`，再按 `role`（`undo` / `copy` / `paste`…，Electron 默认英文）补上中文 `label`。这种「导出后处理」和菜单具体长什么样无关，跨版本不容易坏。

## 已知局限

- 拼接句的尾巴：JSX 把 `["前缀", {变量}, " 后缀"]` 拆成几个文本节点，词典能命中独立片段，但 `" open at a time."` 这种零碎尾巴未必收录，可能中英混排。
- 带变量插值的整句不翻。
- 故意留英文的：HTTP 方法、`Content-Type` 等头名、快捷键、URL、文件扩展名、纯缩写（JSON / JWT / OAuth）、`getVar()` 这类标识符。

对一个没有 i18n 框架的压缩打包应用来说，运行时字典翻译注定有一条翻不完的长尾。这个项目优先保证高频可见文本翻到位，以及不出功能问题。
