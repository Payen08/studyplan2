# 第三方内容策略

## Echo 考研英语

- 来源：<https://github.com/Echo1LZJY/echo-kaoyan-english-skill>
- 固定版本：`48ed6918fd2d3dcc5ec9b1b47b2519544cc800bd`
- 当前许可状态：未确认可再分发许可证。
- App 仅发布检索协议、解析规则、评分工作流和用户本地目录导入能力；真题正文、译文和答案不进入生产包。
- `public/third-party/manifest.json` 中的 `licensedContent` 未明确改为 `true` 前，构建门禁会拒绝该目录下的语料。

## NovaForge

- 来源：<https://github.com/SiriusFzh/NovaForge>
- 固定版本：`bb68c0e644b8909cbfee5416cf20cf19e85d207c`
- 许可证：MIT。
- App 使用其结构化知识组织原则与模板，生成结果为可编辑富文本，并保留 Markdown 结构。
