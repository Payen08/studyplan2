import { describe, expect, it } from 'vitest'
import { buildNovaForgeNote } from './novaforge'

describe('NovaForge note templates', () => {
  it('builds the mistake knowledge loop and escapes imported text', () => {
    const note = buildNovaForgeNote('mistakes', '函数 <专题>', '<script>alert(1)</script>')
    expect(note.sections).toEqual(['知识缺口', '错误模式', '正确方法', '变式练习', '复测记录'])
    expect(note.html).toContain('&lt;script&gt;')
    expect(note.html).not.toContain('<script>')
  })
})
