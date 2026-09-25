import { useState, useEffect } from 'react'
import {
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Layers3,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useData } from '../data/DataContext'
import { active, baseRecord, subjectProgress } from '../data/helpers'
import type { Subject, SyllabusNode } from '../types'
import { Chip, CircularProgress, Empty, Modal, Progress } from '../components/ui'

const defaultSyllabusTemplates: Record<string, string[]> = {
  英语: [
    '第一章：核心词汇与高频短语突击背诵',
    '第二章：历年真题长难句语法结构拆解',
    '第三章：传统阅读理解四大题型解题技巧',
    '第四章：新题型与完形填空提分专项',
    '第五章：应用文小作文高分书信模板',
    '第六章：图表/图画大作文语料库与论述',
  ],
  政治: [
    '第一部分：马克思主义基本原理 (唯物论/辩证法/政经)',
    '第二部分：毛泽东思想和中国特色社会主义理论体系',
    '第三部分：中国近现代史纲要重要时间线与节点',
    '第四部分：思想道德与法治法律核心素养',
    '第五部分：当代世界经济与政治及考前热点时政',
  ],
  数学: [
    '第一章：函数、极限、连续与间断点分析',
    '第二章：一元函数微分学与中值定理证明',
    '第三章：一元函数积分学与反常积分计算',
    '第四章：多元函数微积分与极值最值求解',
    '第五章：线性代数·矩阵、向量组与线性方程组',
    '第六章：特征值特征向量与二次型化简',
  ],
  手绘: [
    '第一阶段：线条基础与透视空间表达规范',
    '第二阶段：经典快题形体与空间结构拆解',
    '第三阶段：马克笔与彩铅上色光影技法',
    '第四阶段：快题方案构思与排版版面设计',
    '第五阶段：真题快题全真限时模拟演练',
  ],
  专业课: [
    '第一阶段：专业基础理论框架梳理与第一轮精读',
    '第二阶段：核心教材重点章节课后典型习题精练',
    '第三阶段：历年真题高频核心考点与论述题突破',
    '第四阶段：学科最新学术前沿动态与行业热点整理',
    '第五阶段：考前全真模拟主观题应试规范演练',
  ],
}

export function Subjects() {
  const { data, userId, upsert, remove } = useData()
  const rawSubjects = active(data.subjects)
    .filter((s) => s != null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const subjects = rawSubjects.filter(
    (s, idx, arr) =>
      arr.findIndex(
        (x) => String(x?.name || '').trim() === String(s?.name || '').trim()
      ) === idx
  )
  const nodes = active(data.syllabus_nodes)
  const tasks = active(data.tasks)
  const mistakes = active(data.mistakes)
  const [selected, setSelected] = useState(subjects[0]?.id ?? '')
  const [subjectModal, setSubjectModal] = useState(false)
  const [nodeModal, setNodeModal] = useState(false)
  const [parentChapterId, setParentChapterId] = useState<string | null>(null)

  useEffect(() => {
    if (subjects.length && (!selected || !subjects.some((s) => s.id === selected))) {
      setSelected(subjects[0].id)
    }
  }, [subjects, selected])

  const current = subjects.find((s) => s.id === selected) ?? subjects[0]
  const ownNodes = nodes.filter((n) => n.subject_id === current?.id)
  const chapters = ownNodes.filter((n) => !n.parent_id).sort((a, b) => a.sort_order - b.sort_order)

  const doneCount = chapters.filter((c) => c.status === 'done').length
  const doingCount = chapters.filter((c) => c.status === 'doing').length
  const todoCount = chapters.filter((c) => c.status === 'todo').length
  const masteryFor = (subjectId: string) => {
    const syllabus = subjectProgress(subjectId, nodes)
    const ownMistakes = mistakes.filter((item) => item.subject_id === subjectId)
    if (!ownMistakes.length) return syllabus
    const retest = Math.round(ownMistakes.filter((item) => item.mastered).length / ownMistakes.length * 100)
    return Math.round(syllabus * 0.7 + retest * 0.3)
  }
  const progress = current ? masteryFor(current.id) : 0

  useEffect(() => {
    for (const node of nodes) {
      const linked = tasks.filter((task) => task.syllabus_node_id === node.id)
      const nextStatus = !linked.length ? 'todo' : linked.every((task) => task.status === 'done') ? 'done' : linked.some((task) => task.status !== 'todo') ? 'doing' : 'todo'
      if (node.status !== nextStatus) void upsert('syllabus_nodes', { ...node, status: nextStatus })
    }
  }, [nodes, tasks, upsert])

  const loadTemplate = async (subjectName: string) => {
    if (!current) return
    const key =
      Object.keys(defaultSyllabusTemplates).find((k) => subjectName.includes(k)) ?? '专业课'
    const items = defaultSyllabusTemplates[key] || defaultSyllabusTemplates['专业课']
    for (let i = 0; i < items.length; i++) {
      const node: SyllabusNode = {
        ...baseRecord(userId),
        subject_id: current.id,
        parent_id: null,
        title: items[i],
        kind: 'chapter',
        status: i === 0 ? 'doing' : 'todo',
        sort_order: chapters.length + i,
      }
      await upsert('syllabus_nodes', node)
    }
  }

  const saveSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const subject: Subject = {
      ...baseRecord(userId),
      name: String(f.get('name')),
      color: String(f.get('color')),
      sort_order: subjects.length,
      status: 'active',
    }
    await upsert('subjects', subject)
    setSelected(subject.id)
    setSubjectModal(false)
  }

  const saveNode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const parent = parentChapterId || String(f.get('parent')) || null
    const node: SyllabusNode = {
      ...baseRecord(userId),
      subject_id: current.id,
      parent_id: parent,
      title: String(f.get('title')),
      kind: parent ? 'topic' : 'chapter',
      status: 'todo',
      sort_order: ownNodes.length,
    }
    await upsert('syllabus_nodes', node)
    setNodeModal(false)
    setParentChapterId(null)
  }

  const handleDeleteNode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await remove('syllabus_nodes', id)
  }

  const handleDeleteSubject = async (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation()
    const subjectNodes = nodes.filter((n) => n.subject_id === subject.id)
    if (confirm(`确定要删除科目「${subject.name}」吗？`)) {
      for (const n of subjectNodes) {
        await remove('syllabus_nodes', n.id)
      }
      await remove('subjects', subject.id)
      const remaining = subjects.filter((s) => s.id !== subject.id)
      if (remaining.length) setSelected(remaining[0].id)
    }
  }

  return (
    <div className="subjects-layout">
      {/* Left Rail: Clean Hero UI Subject Navigation */}
      <aside className="subject-rail">
        <div className="subject-rail-head">
          <div className="subject-rail-title-wrap">
            <BookOpen size={16} className="subject-rail-icon" />
            <span>科目分类</span>
            <span className="subject-count-pill">{subjects.length}</span>
          </div>
          <button
            className="subject-add-btn"
            onClick={() => setSubjectModal(true)}
            title="新建备考科目"
            aria-label="新建科目"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="subject-list">
          {subjects.map((subject) => {
            const subjectNodeCount = nodes.filter((n) => n.subject_id === subject.id).length
            const subjectProg = masteryFor(subject.id)
            const isActive = subject.id === current?.id

            return (
              <div
                key={subject.id}
                className={`subject-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelected(subject.id)}
                role="button"
                tabIndex={0}
              >
                <div className="subject-card-body">
                  <div className="subject-card-title-row">
                    <strong className="subject-name">{subject.name}</strong>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        subjectProg === 100
                          ? 'success'
                          : subjectProg > 0
                          ? 'primary'
                          : 'default'
                      }
                      className="subject-prog-hero-chip"
                    >
                      {subjectProg}%
                    </Chip>
                  </div>
                  <div className="subject-card-sub-row">
                    <small className="subject-count-text">{subjectNodeCount} 个章节/专题</small>
                    <button
                      type="button"
                      className="subject-quick-del-btn"
                      onClick={(e) => handleDeleteSubject(subject, e)}
                      title="删除该科目"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {subjectProg > 0 && (
                  <div className="subject-card-bar-track">
                    <div
                      className="subject-card-bar-fill"
                      style={{
                        width: `${subjectProg}%`,
                        background: subjectProg === 100 ? 'var(--success)' : 'var(--accent)',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Right Workspace: Hero UI Syllabus Panel */}
      <section className="panel syllabus-panel">
        {current ? (
          <>
            {/* Top Hero Banner */}
            <div className="hero-subject-banner">
              <div className="hero-banner-main">
                <div className="hero-banner-badge-row">
                  <span className="hero-eyebrow-pill">
                    <Sparkles size={11} /> 知识大纲 · SYLLABUS
                  </span>
                  <span className="hero-sub-counter">
                    共 {chapters.length} 章节
                  </span>
                </div>
                <h2 className="hero-banner-title">
                  <span>{current.name}</span>
                </h2>

                <div className="hero-banner-metrics">
                  <Chip size="sm" variant="flat" color="success">
                    <Check size={12} /> 已完成 {doneCount} 节
                  </Chip>
                  <Chip size="sm" variant="flat" color="warning">
                    <Clock3 size={12} /> 进行中 {doingCount} 节
                  </Chip>
                  <Chip size="sm" variant="flat" color="default">
                    未开始 {todoCount} 节
                  </Chip>
                </div>
              </div>

              {/* Hero UI CircularProgress Widget */}
              <div className="hero-banner-stat-box">
                <CircularProgress
                  size="lg"
                  value={progress}
                  color={progress === 100 ? 'success' : 'primary'}
                  label="综合掌握度"
                />
              </div>
            </div>

            {/* Linear Progress Indicator */}
            <div className="hero-progress-wrapper">
              <Progress
                value={progress}
                color={progress === 100 ? 'var(--success)' : 'var(--accent)'}
                size="sm"
              />
            </div>

            {/* Syllabus Actions Bar */}
            <div className="syllabus-toolbar">
              <div className="syllabus-title-wrap">
                <h3>章节与专题</h3>
                <span className="hero-count-pill">{chapters.length} 章节</span>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => loadTemplate(current.name)}
                  title="自动补充推荐考研大纲知识模块"
                >
                  <Sparkles size={15} /> 导入大纲模板
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setParentChapterId(null)
                    setNodeModal(true)
                  }}
                >
                  <Plus size={15} /> 添加章节
                </button>
              </div>
            </div>

            {/* Chapters & Topics List */}
            {chapters.length ? (
              <div className="hero-syllabus-tree">
                {chapters.map((chapter, idx) => {
                  const subtopics = ownNodes
                    .filter((n) => n.parent_id === chapter.id)
                    .sort((a, b) => a.sort_order - b.sort_order)

                  return (
                    <article key={chapter.id} className="hero-chapter-card">
                      <div
                        className={`hero-chapter-row ${chapter.status}`}
                      >
                        <button
                          type="button"
                          className="hero-status-btn"
                          aria-label="由关联任务和复测自动计算"
                          disabled
                        >
                          {chapter.status === 'done' ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : chapter.status === 'doing' ? (
                            <Clock3 size={16} className="text-warning" />
                          ) : (
                            <Circle size={16} className="text-muted" />
                          )}
                        </button>

                        <div className="hero-chapter-info">
                          <strong>
                            <span className="chapter-idx">#{idx + 1}</span> {chapter.title}
                          </strong>
                          {subtopics.length > 0 && (
                            <small>{subtopics.length} 个考点小专题</small>
                          )}
                        </div>

                        <div className="hero-chapter-actions" onClick={(e) => e.stopPropagation()}>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              chapter.status === 'done'
                                ? 'success'
                                : chapter.status === 'doing'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {chapter.status === 'todo'
                              ? '未开始'
                              : chapter.status === 'doing'
                              ? '进行中'
                              : '已完成'}
                          </Chip>

                          <button
                            type="button"
                            className="hero-subtopic-add-btn"
                            onClick={() => {
                              setParentChapterId(chapter.id)
                              setNodeModal(true)
                            }}
                            title="添加子考点/专题"
                          >
                            <Plus size={13} /> 专题
                          </button>

                          <button
                            type="button"
                            className="hero-node-del-btn"
                            onClick={(e) => handleDeleteNode(chapter.id, e)}
                            title="删除该章节"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Subtopics (Nested tree) */}
                      {subtopics.length > 0 && (
                        <div className="hero-subtopic-list">
                          {subtopics.map((topic) => (
                            <div
                              key={topic.id}
                              className={`hero-subtopic-row ${topic.status}`}
                            >
                              <span className="hero-tree-connector" />
                              <button
                                type="button"
                                className="hero-status-btn-sm"
                                aria-label="由关联任务和复测自动计算"
                                disabled
                              >
                                {topic.status === 'done' ? (
                                  <Check size={13} className="text-success" />
                                ) : topic.status === 'doing' ? (
                                  <Clock3 size={13} className="text-warning" />
                                ) : (
                                  <Circle size={13} className="text-muted" />
                                )}
                              </button>
                              <span className="hero-subtopic-title">{topic.title}</span>
                              <div
                                className="hero-subtopic-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={
                                    topic.status === 'done'
                                      ? 'success'
                                      : topic.status === 'doing'
                                      ? 'warning'
                                      : 'default'
                                  }
                                >
                                  {topic.status === 'todo'
                                    ? '未开始'
                                    : topic.status === 'doing'
                                    ? '进行中'
                                    : '已完成'}
                                </Chip>
                                <button
                                  type="button"
                                  className="hero-node-del-btn"
                                  onClick={(e) => handleDeleteNode(topic.id, e)}
                                  title="删除此专题"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <Empty
                icon={<Layers3 size={32} className="text-primary" />}
                title={`暂无「${current.name}」大纲内容`}
                action={
                  <div className="button-row">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => loadTemplate(current.name)}
                    >
                      <Sparkles size={16} /> 导入推荐大纲
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setParentChapterId(null)
                        setNodeModal(true)
                      }}
                    >
                      <Plus size={16} /> 添加章节
                    </button>
                  </div>
                }
              />
            )}

            {/* Bottom Actions */}
            <div className="syllabus-bottom-bar">
              <button
                type="button"
                className="archive-link"
                onClick={() => upsert('subjects', { ...current, status: 'archived' })}
              >
                <Archive size={14} />
                归档该科目
              </button>
              <button
                type="button"
                className="delete-subject-link"
                onClick={(e) => handleDeleteSubject(current, e)}
              >
                <Trash2 size={14} />
                彻底删除该科目
              </button>
            </div>
          </>
        ) : (
          <Empty
            icon={<BookOpen size={32} className="text-muted" />}
            title="选择或新建科目"
            action={
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSubjectModal(true)}
              >
                <Plus size={16} /> 新建科目
              </button>
            }
          />
        )}
      </section>

      {/* New Subject Modal */}
      {subjectModal && (
        <Modal title="新建备考科目" onClose={() => setSubjectModal(false)}>
          <form className="form-grid" onSubmit={saveSubject}>
            <label className="full">
              科目名称
              <input
                name="name"
                required
                autoFocus
                placeholder="例如：高等数学 / 手绘快题 / 英语一"
              />
            </label>
            <label className="full">
              标识颜色
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <input
                  name="color"
                  type="color"
                  defaultValue="#006fee"
                  style={{ width: 44, height: 38, padding: 2, borderRadius: 8, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  用于月历与各看板的视觉标记
                </span>
              </div>
            </label>
            <button className="primary-btn full" type="submit" style={{ marginTop: 12 }}>
              创建科目
            </button>
          </form>
        </Modal>
      )}

      {/* Add Chapter / Topic Modal */}
      {nodeModal && current && (
        <Modal
          title={parentChapterId ? '添加子考点/专题' : '添加章节 / 专题'}
          onClose={() => {
            setNodeModal(false)
            setParentChapterId(null)
          }}
        >
          <form className="form-grid" onSubmit={saveNode}>
            <label className="full">
              {parentChapterId ? '专题名称' : '章节名称'}
              <input
                name="title"
                required
                autoFocus
                placeholder={
                  parentChapterId
                    ? '例如：专题 1：导数的定义与几何意义'
                    : '例如：第一章 函数极限与连续'
                }
              />
            </label>
            {!parentChapterId && (
              <label className="full">
                上级归属
                <select name="parent">
                  <option value="">作为一级章节</option>
                  {chapters.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="primary-btn full" type="submit" style={{ marginTop: 12 }}>
              保存
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
