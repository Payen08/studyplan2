import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(process.cwd(), '.local-content', 'echo', 'references')
if (!existsSync(root)) throw new Error('未找到 .local-content/echo/references，请先执行受控本地导入。')

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})

const files = walk(root).filter((path) => ['.md', '.json', '.txt'].includes(extname(path)))
const entries = files.map((path) => {
  const key = relative(root, path).replaceAll('\\', '/')
  const parts = key.split('/')
  const yearIndex = parts.findIndex((part) => /^20\d{2}$/.test(part))
  const file = parts.at(-1) || ''
  const text = file.match(/reading-text-(\d+)/)?.[1]
  return {
    path: key,
    exam: parts.find((part) => part === 'english-i' || part === 'english-ii') || null,
    year: yearIndex >= 0 ? Number(parts[yearIndex]) : null,
    section: file.replace(/\.(md|json|txt)$/i, '').replace(/reading-text-\d+/, 'reading'),
    text: text ? Number(text) : null,
    bytes: Buffer.byteLength(readFileSync(path)),
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
})

writeFileSync(resolve(process.cwd(), '.local-content', 'echo', 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), licensedContent: false, entries }, null, 2))
console.log(`Echo local index generated: ${entries.length} files`)
