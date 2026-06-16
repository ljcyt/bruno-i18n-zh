# Bruno 简体中文汉化

为开源 API 客户端 [Bruno](https://www.usebruno.com/) 提供的简体中文界面汉化补丁。

补丁通过向 Bruno 的 `app.asar` 注入一段脚本，在界面渲染时将英文文本替换为中文，不修改源码，也不改变功能逻辑。

本项目为个人维护的非官方汉化，与 Bruno 官方无关。项目仅包含界面翻译，不涉及授权（License）相关的任何改动，请使用免费版或自行购买合法授权。修改 `app.asar` 属于对已安装程序的改动，存在风险；脚本在首次运行时会将原文件备份为 `app.asar.bak`，可随时还原。

适用于 **Bruno 3.4.2** 并在该版本上测试。词典按英文原文匹配，与版本内部结构无关，其他版本通常亦可使用，新版本至多会有少量文案未覆盖。

## 设计说明

Bruno 未使用 i18n 框架，界面文本以硬编码形式存在于打包后的 JavaScript 文件（约 5 MB）中。两种常见思路均不适用：

- **直接替换打包文件中的英文字符串。** 这些字符串常与逻辑共用同一字面量，例如 `"Send"` 为按钮文本，而相邻的 `"send"` 为动作类型，直接替换会破坏行为；且文件名包含内容哈希，每次发版均会变化，难以维护。
- **监听 DOM 后替换（MutationObserver）。** React 重渲染会将文本重新写回英文；若以 `WeakSet` 记录"已翻译"来避免重复，重渲染后将无法再次翻译，界面会退回英文。

本项目的做法是在 React 写入 DOM 之前，挂钩 `textContent`、`setAttribute` 等写入接口，在写入时查词典替换。由于在写入时拦截，每次重渲染都会重新翻译，不会被还原，也不会闪烁。代码编辑器、输入框等区域会被跳过，不影响请求体与脚本内容。

实现细节见 [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)。

## 使用

环境要求：Windows、[Node.js](https://nodejs.org/)（脚本通过 `npx` 解包与打包 asar）、已安装的 Bruno（在 3.4.2 上验证）。

关闭 Bruno 后，在仓库目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\apply.ps1
```

脚本会自动定位 Bruno 安装路径。如安装在非默认位置，使用 `-AsarPath` 指定；如需脚本自动结束 Bruno 进程，添加 `-Force`（会丢失未保存内容）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\apply.ps1 -AsarPath "D:\Apps\Bruno\resources\app.asar" -Force
```

完成后启动 Bruno 即为中文界面。首次运行会生成备份 `app.asar.bak`。

还原至原始状态：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -Force
```

## 关于软件更新

Bruno 使用 electron-updater 自动更新，更新会整体替换 `app.asar`，汉化随之失效。如需保留，请在偏好设置中关闭自动更新（对应 `%APPDATA%\bruno\preferences.json` 中的 `autoupdate.downloadUpdates`）。更新到新版本后，重新运行 `apply.ps1` 即可。

## 修改与补充翻译

词典位于 [`src/zh-CN.json`](src/zh-CN.json)，键为英文原文，值为中文。修改后执行构建，将词典内联进引擎并生成 `src/i18n.js`（实际注入的文件）：

```bash
node build.js
```

随后提交 Pull Request。翻译约定详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 目录结构

```
src/zh-CN.json        翻译词典
src/engine.js         翻译引擎（含 __DICT__ 占位符）
src/i18n.js           构建产物，用于注入
src/menu-zh.js        原生菜单本地化片段
scripts/apply.ps1     安装
scripts/restore.ps1   还原
build.js              构建脚本（词典 + 引擎 → i18n.js）
docs/HOW-IT-WORKS.md  实现说明
```

## macOS / Linux

`src/i18n.js` 与 `src/menu-zh.js` 为跨平台文件，仅 `apply.ps1` 为 Windows 脚本。其他平台可手动完成等效步骤：使用 `npx @electron/asar extract` 解包，放入 `i18n.js` 并在 `web/index.html` 中 `index.<hash>.js` 之前插入 `<script defer src="static/js/i18n.js"></script>`，再以 `npx @electron/asar pack ... --unpack "*.node"` 重新打包。欢迎提交对应平台的脚本。

## License

代码与译文均以 MIT 许可发布。Bruno 商标及软件版权归 Bruno Software Inc. 所有。本项目仅包含界面翻译，不含任何授权相关改动。
