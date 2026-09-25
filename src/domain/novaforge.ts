export type NovaForgeMode = 'chapter' | 'kaoyan' | 'mistakes'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

export function buildNovaForgeNote(mode: NovaForgeMode, title: string, sourceText: string) {
  const safeTitle = escapeHtml(title.trim() || '结构化学习笔记')
  const safeSource = escapeHtml(sourceText.trim()).replace(/\n/g, '<br>')
  const sections = mode === 'mistakes'
    ? ['知识缺口', '错误模式', '正确方法', '变式练习', '复测记录']
    : mode === 'kaoyan'
      ? ['基础概念', '核心原理', '方法速通', '真题与来源', '配套练习', '易错点', '总结复盘']
      : ['概念引入', '核心原理', '方法速通', '典型示例', '实战应用', '巩固练习', '总结复盘']
  const html = `<h1>${safeTitle}</h1>${safeSource ? `<blockquote>${safeSource}</blockquote>` : ''}${sections.map((section) => `<h2>${section}</h2><p></p>`).join('')}`
  const markdown = `# ${title.trim() || '结构化学习笔记'}\n\n${sourceText ? `> ${sourceText.replace(/\n/g, '\n> ')}\n\n` : ''}${sections.map((section) => `## ${section}\n\n`).join('')}`
  return { html, markdown, sections }
}
