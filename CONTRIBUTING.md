# 贡献

欢迎补翻译、改错译。

## 流程

翻译都在 [`src/zh-CN.json`](src/zh-CN.json)，键是界面里的英文原文，值是中文。注意键要和界面英文逐字一致（大小写、标点都算）；引擎查表前会 `trim()`，所以首尾空格可以不写。

改完跑一下构建，把词典内联进引擎生成 `src/i18n.js`：

```bash
node build.js
node --check src/i18n.js   # 顺手检查语法
```

然后提 PR，说一下大概改了哪些界面。

## 怎么拿到准确的英文原文

大多数时候界面显示什么就写什么（注意大小写）。实在对不上，可以解包打包文件搜：

```bash
npx @electron/asar extract "<app.asar 路径>" ./_tmp
# 在 _tmp/web/static/js/index.<hash>.js 里搜那个英文串
```

## 约定

术语尽量统一：Collection 集合、Request 请求、Environment 环境、Workspace 工作区、Header(s) 请求头、Query Params 查询参数、Body 请求体、Auth/Authentication 认证、Response 响应、Stash 暂存、Commit 提交、Remote 远程、Spec 规范、Secret 密钥、Token 令牌、Proxy 代理、Endpoint 端点。

这些保持英文，别收也别译：HTTP 头名（`Content-Type` 等）、快捷键（`Ctrl+C`、`F11`）、URL 和文件名（`tar.gz`、`workspace.yml`）、代码标识符（`getVar()`、`setVar()`、纯小写枚举值）、纯缩写和协议名（`JSON`、`XML`、`JWT`、`OAuth`、`gRPC`、`WebSocket`）。

歧义太大的极通用词不要收。比如 `"No"` 在「是 / 否」对话框里是「否」、在「No items」里是「无」，精确匹配区分不了，收了就会译错。也别翻会被当数据提交的内容（引擎本来就不翻 `value`，词典里也别加）。

## 不收的改动

这个项目只做界面翻译。涉及授权（License）验证、解锁付费功能、绕过校验的改动一律不收，相关 PR 和 Issue 会直接关掉。
