# 贡献指南

欢迎补充翻译或修正错译。

## 流程

翻译内容位于 [`src/zh-CN.json`](src/zh-CN.json)，键为界面中的英文原文，值为中文。键须与界面英文逐字一致（包括大小写与标点）；引擎查表前会执行 `trim()`，因此首尾空格可省略。

修改后执行构建，将词典内联进引擎并生成 `src/i18n.js`：

```bash
node build.js
node --check src/i18n.js   # 检查语法
```

随后提交 Pull Request，并简要说明涉及的界面。

## 获取准确的英文原文

多数情况下界面显示的文本即为词典的键（注意大小写）。如无法对应，可解包打包文件检索：

```bash
npx @electron/asar extract "<app.asar 路径>" ./_tmp
# 在 _tmp/web/static/js/index.<hash>.js 中检索目标英文串
```

## 翻译约定

术语保持统一：Collection 集合、Request 请求、Environment 环境、Workspace 工作区、Header(s) 请求头、Query Params 查询参数、Body 请求体、Auth / Authentication 认证、Response 响应、Stash 暂存、Commit 提交、Remote 远程、Spec 规范、Secret 密钥、Token 令牌、Proxy 代理、Endpoint 端点。

以下内容保留英文，不予收录或翻译：HTTP 头名（`Content-Type` 等）、快捷键（`Ctrl+C`、`F11`）、URL 与文件名（`tar.gz`、`workspace.yml`）、代码标识符（`getVar()`、`setVar()`、纯小写枚举值）、纯缩写与协议名（`JSON`、`XML`、`JWT`、`OAuth`、`gRPC`、`WebSocket`）。

歧义过大的通用词不予收录。例如 `"No"` 在"是 / 否"对话框中应为"否"、在"No items"中应为"无"，精确匹配无法区分，收录将导致误译。亦不翻译会被作为数据提交的内容（引擎本身不翻译 `value`，词典中也不应加入此类条目）。

## 不予接受的改动

本项目仅包含界面翻译。涉及授权（License）验证、解锁付费功能或绕过校验的改动一律不予接受，相关 Pull Request 与 Issue 将予关闭。
