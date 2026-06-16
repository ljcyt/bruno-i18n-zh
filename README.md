# Bruno 简体中文汉化 (bruno-i18n-zh)

为 [Bruno](https://www.usebruno.com/)（开源 API 客户端）提供的**非官方**简体中文界面汉化补丁。

通过向 Bruno 的 `app.asar` 注入一段运行时脚本，在 React 渲染层实时把界面英文替换为中文，**无需修改 Bruno 源码、不改变任何功能逻辑**。

---

## ⚠️ 免责声明

- 本项目是**社区非官方**汉化，与 Bruno 官方（Bruno Software Inc.）无关。
- 本项目**只做界面翻译**，**不包含、也不涉及任何授权（License）破解或绕过**。请使用 Bruno 免费版，或自行购买合法的付费授权。任何对授权机制的修改都与本项目无关，且不被支持。
- 修改 `app.asar` 属于对已安装程序的改动，**风险自负**。脚本会在首次运行时自动备份原始文件（`app.asar.bak`），可随时还原。
- **软件更新会覆盖汉化**（详见下文「软件更新须知」）。

---

## ✨ 特性

- **覆盖 React 组件文本**：按钮、标签、占位符、`title`、`aria-label` 等。传统「DOM 替换」方案会被 React 重渲染还原，本方案在 DOM 写入 API 的 setter 层拦截，**每次渲染都即时翻译**，不会被还原。
- **不污染用户内容**：自动跳过代码编辑器（CodeMirror/Monaco）、输入框、`contenteditable` 等区域，绝不会动你的请求体、脚本、响应内容。
- **原生菜单本地化**：结构无关地翻译应用菜单（文件 / 编辑 / 视图 / 帮助等）。
- **1200+ 条精校词典**，与 Postman / Apifox 等常见译法保持一致。
- **一键安装 / 还原**，幂等可重复运行。

---

## 📦 环境要求

- **Windows**（脚本基于 PowerShell；macOS / Linux 见下文「其他平台」）
- 已安装 [Node.js](https://nodejs.org/)（提供 `npx`，用于解包 / 打包 asar）
- 已安装 Bruno 桌面版

---

## 🚀 使用方法

1. 下载本仓库（`Code → Download ZIP`，或 `git clone`）。
2. **完全退出 Bruno**（保存好未保存的内容）。
3. 打开 PowerShell，进入仓库目录，运行：

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\apply.ps1
   ```

   - 脚本会自动定位 Bruno 安装路径；若装在非默认位置，用 `-AsarPath` 指定：
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts\apply.ps1 -AsarPath "D:\Apps\Bruno\resources\app.asar"
     ```
   - 若不想手动关 Bruno，可加 `-Force` 让脚本自动结束进程（会丢失未保存内容）：
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts\apply.ps1 -Force
     ```
4. 启动 Bruno，界面即为中文。

> 首次运行会生成 `app.asar.bak`（原始备份，仅备份一次）。

---

## ↩️ 卸载 / 还原

退出 Bruno 后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -Force
```

即从 `app.asar.bak` 还原到汉化前的原始状态。

---

## 🔄 软件更新须知

Bruno 使用 `electron-updater` 自动更新，**任何更新都会整体覆盖 `app.asar`，从而清除汉化**。应对方式：

- **想保留汉化**：在 Bruno 的「偏好设置」中关闭「自动检查 / 下载更新」。
  （对应用户配置 `%APPDATA%\bruno\preferences.json` 中的 `autoupdate.downloadUpdates: false`。）
- **更新到新版后**：重新退出 Bruno，再次运行 `scripts\apply.ps1` 即可。
  词典按英文原文匹配、与 Bruno 内部结构无关，因此**跨版本基本可直接复用**；新版本若新增了英文文案，只会表现为「个别未翻译」，不会报错。

---

## 🛠️ 工作原理（简述）

Bruno 的界面文本是硬编码在压缩后的 React 打包文件里的，没有 i18n 框架。本项目不改打包文件（那样会误伤逻辑），而是注入 `i18n.js`：

1. 在 React 渲染**之前**，劫持 `Node.prototype.textContent` / `nodeValue`、`Element.setAttribute`、`createTextNode` 等 DOM 写入接口。
2. 每当 React 写入文本时，按**精确匹配**词典即时替换为中文；命中后保留首尾空格，不匹配则原样放行。
3. 因为是在「写入时」拦截，React 的虚拟 DOM 重渲染会再次触发翻译，**不存在被还原的问题**。

详见 [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)。

---

## 🤝 贡献翻译

词典是 [`src/zh-CN.json`](src/zh-CN.json)，键为英文原文、值为中文。

1. 编辑 `src/zh-CN.json`（增改条目，键须与界面英文**完全一致**）。
2. 重新构建可分发脚本：
   ```bash
   node build.js
   ```
   会把词典内联进 `src/engine.js`，生成 `src/i18n.js`。
3. 提交 PR。

**翻译约定**：技术名词（如 `Collection=集合`、`Request=请求`、`Environment=环境`）保持统一；HTTP 头名、快捷键、URL、`getVar()` 等代码标识符**保持英文**；像 `"No"`（是/否对话框里应为「否」，空状态里应为「无」）这类有歧义的极通用词不收录，避免误译。

---

## 📁 仓库结构

```
bruno-i18n-zh/
├── README.md
├── LICENSE                 # 本项目代码的开源许可（MIT）
├── build.js                # 词典 + 引擎 → 可分发 i18n.js
├── src/
│   ├── zh-CN.json          # 翻译词典（贡献者编辑这个）
│   ├── engine.js           # 翻译引擎（含 __DICT__ 占位符）
│   ├── i18n.js             # 构建产物：注入 Bruno 的脚本
│   └── menu-zh.js          # 原生菜单本地化片段
├── scripts/
│   ├── apply.ps1           # 安装汉化
│   └── restore.ps1         # 还原原始版
└── docs/
    └── HOW-IT-WORKS.md     # 技术原理
```

---

## 其他平台（macOS / Linux）

核心产物 `src/i18n.js` 与 `src/menu-zh.js` 是跨平台的，仅 `apply.ps1` 是 Windows 脚本。在 macOS / Linux 上可手动完成等效步骤：用 `npx @electron/asar extract` 解包 → 放入 `i18n.js` 并在 `web/index.html` 注入 `<script defer src="static/js/i18n.js"></script>`（置于 `index.<hash>.js` 之前）→ `npx @electron/asar pack ... --unpack "*.node"` 重新打包。欢迎 PR 提交对应平台脚本。

---

## 📄 License

本仓库代码采用 [MIT License](LICENSE)。
词典译文亦以 MIT 提供。Bruno 商标及软件版权归 Bruno Software Inc. 所有。
