# Bruno 简体中文汉化

给 [Bruno](https://www.usebruno.com/)（开源 API 客户端）做的简体中文界面补丁。

做法是往 Bruno 的 `app.asar` 里塞一段脚本，在界面渲染时把英文换成中文，不改源码、不动功能逻辑。

基于 **Bruno 3.4.2** 制作和测试。词典按英文原文匹配、和版本结构无关，其他版本一般也能用，新版顶多几句没翻到。

这是个人维护的非官方项目，和 Bruno 官方没有关系。只翻译界面，不涉及授权（License）那一套——用免费版或自己买授权都行。改 `app.asar` 属于改动已安装的程序，有风险；脚本第一次运行会把原文件备份成 `app.asar.bak`，随时能还原。

## 为什么不是直接替换文本

Bruno 没有用 i18n 框架，界面文本是写死在打包后的 JS（约 5MB）里的。两条看似简单的路都不通：

- **直接改打包文件里的英文**：这些字符串经常和逻辑共用，比如 `"Send"` 是按钮文字，旁边的 `"send"` 却是动作类型，盲改会出事；而且文件名带哈希，每次发版都变。
- **监听 DOM 再替换**（MutationObserver 那套）：React 重渲染会把英文写回去，很多 DIY 汉化「大部分还是英文」就是这个原因。

这里的做法是在 React 写 DOM **之前**，挂钩 `textContent`、`setAttribute` 这些写入接口，写进去的那一刻查词典替换。因为是写入时拦截，每次重渲染都会再走一遍，不存在被还原的问题，也没有闪烁。代码编辑器、输入框这些区域会跳过，不会动到你的请求体和脚本内容。

原理细节见 [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)。

## 用法

需要 Windows、[Node.js](https://nodejs.org/)（脚本用 `npx` 解包 / 打包 asar）、装好的 Bruno（在 3.4.2 上验证过）。

先彻底关掉 Bruno，然后在仓库目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\apply.ps1
```

脚本会自己找 Bruno 的安装路径。装在别处就用 `-AsarPath` 指定，不想手动关 Bruno 就加 `-Force`（会丢未保存内容）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\apply.ps1 -AsarPath "D:\Apps\Bruno\resources\app.asar" -Force
```

启动 Bruno 就是中文了。还原用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -Force
```

## 软件更新会覆盖汉化

Bruno 用 electron-updater 自动更新，更新一次就把 `app.asar` 整个换掉，汉化也就没了。想保留就去偏好设置里关掉自动更新（对应 `%APPDATA%\bruno\preferences.json` 里的 `autoupdate.downloadUpdates`）。

更新到新版之后，重新跑一遍 `apply.ps1` 即可。词典按英文原文匹配，和 Bruno 内部结构无关，跨版本基本能直接用；新版要是加了新文案，顶多表现为几句没翻到，不会报错。

## 改 / 加翻译

词典是 [`src/zh-CN.json`](src/zh-CN.json)，键是英文原文，值是中文。改完跑一下：

```bash
node build.js
```

它会把词典内联进引擎，生成 `src/i18n.js`（实际注入的就是这个）。然后提交 PR。

几个约定：术语尽量统一（Collection 集合、Request 请求、Environment 环境……）；HTTP 头名、快捷键、URL、`getVar()` 这类代码标识符保持英文；像 `"No"` 这种在「是 / 否」对话框里该是「否」、在「No items」里又该是「无」的歧义词不收录，免得译错。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 目录

```
src/zh-CN.json     翻译词典（改这里）
src/engine.js      翻译引擎（含 __DICT__ 占位符）
src/i18n.js        build.js 的产物，注入用
src/menu-zh.js     原生菜单本地化片段
scripts/apply.ps1  安装
scripts/restore.ps1 还原
build.js           词典 + 引擎 → i18n.js
docs/HOW-IT-WORKS.md 原理
```

## macOS / Linux

`src/i18n.js` 和 `src/menu-zh.js` 本身是跨平台的，只有 `apply.ps1` 是 Windows 脚本。其他平台手动做等效操作即可：`npx @electron/asar extract` 解包 → 放入 `i18n.js` 并在 `web/index.html` 的 `index.<hash>.js` 之前插一行 `<script defer src="static/js/i18n.js"></script>` → `npx @electron/asar pack ... --unpack "*.node"` 打回去。欢迎提对应平台的脚本。

## License

代码和译文都是 MIT。Bruno 的商标和软件版权归 Bruno Software Inc.，本项目只含界面翻译，不含任何授权相关的改动。
