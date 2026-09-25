import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'public', 'third-party')
if (!existsSync(root)) process.exit(0)

const manifestPath = resolve(root, 'manifest.json')
if (!existsSync(manifestPath)) throw new Error('第三方内容目录缺少 public/third-party/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

for (const source of manifest.sources ?? []) {
  const sourceDir = resolve(root, source.id)
  const bundledFiles = existsSync(sourceDir) ? readdirSync(sourceDir).filter((name) => !name.startsWith('.')) : []
  if (bundledFiles.length && source.licensedContent !== true) {
    throw new Error(`许可证门禁：${source.id} 未登记授权，不能进入生产构建。`)
  }
}
