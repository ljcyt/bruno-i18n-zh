# 贡献指南

欢迎补充 / 修正翻译！

## 改翻译

1. 编辑 [`src/zh-CN.json`](src/zh-CN.json)。
   - 键 = 界面里的**英文原文**，必须**逐字一致**（含大小写、标点）。引擎按 `trim()` 后精确匹配，所以首尾空格可不写。
   - 值 = 简体中文译文。
2. 构建：
   ```bash
   node build.js
   ```
   生成 `src/i18n.js`（词典内联进引擎）。
3. 自检：
   ```bash
   node --check src/i18n.js
   ```
4. 提交 PR，说明改动涉及哪些界面。

## 找漏译的英文原文

在 Bruno 里看到未翻译的文案，可这样拿到「准确的键」：

- 大多数情况下，**界面上显示什么英文，键就写什么**（注意大小写）。
- 也可解包打包文件搜索（可选）：
  ```bash
  npx @electron/asar extract "<app.asar 路径>" ./_tmp
  # 然后在 _tmp/web/static/js/index.<hash>.js 里搜索该英文串
  ```

## 翻译约定

- **术语统一**：`Collection=集合`、`Request=请求`、`Environment=环境`、`Workspace=工作区`、`Header(s)=请求头`、`Query Params=查询参数`、`Body=请求体`、`Auth/Authentication=认证`、`Response=响应`、`Stash=暂存`、`Commit=提交`、`Remote=远程`、`Spec=规范`、`Secret=密钥`、`Token=令牌`、`Proxy=代理`、`Endpoint=端点`。
- **保持英文**（不要收录或译）：
  - HTTP 头名：`Content-Type`、`User-Agent` 等
  - 快捷键：`Ctrl+C`、`F11`、`Alt+F4`
  - URL、文件名、扩展名：`tar.gz`、`workspace.yml`
  - 代码标识符：`getVar()`、`setVar()`、纯小写枚举值
  - 纯缩写 / 协议：`JSON`、`XML`、`JWT`、`OAuth`、`gRPC`、`WebSocket`
- **歧义极通用词不收录**：例如 `"No"` 在「是/否」对话框里该是「否」、在「No items」里该是「无」，无法靠精确匹配区分，收录会误译。
- 不要翻译会被当作数据提交的内容（引擎本就不翻 `value`，词典里也别加这类）。

## 不接受的改动

本项目**只做界面翻译**。任何涉及授权（License）验证、付费功能解锁、绕过校验的改动一律不接受，相关 PR / Issue 会被关闭。
