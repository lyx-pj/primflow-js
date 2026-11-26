// 包边界守卫。
//
// 分两层：
//   1. 源码级：依赖方向（原因断言）—— 谁 import 谁，一眼可见，不依赖 tree-shaking 是否生效。
//   2. 产物级：external 是否真的生效（结果断言）—— 防止打包器把下层内联回来。
//
// 用法：pnpm build（脚本已串联 verify），或单独 pnpm verify。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = (name) => join(root, 'packages', name)

const failures = []

function record(ok, message) {
  console.log(`${ok ? '✓' : '✗'} ${message}`)
  if (!ok) failures.push(message)
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full)
  }
  return out
}

/** 注释里的示例 import 不算依赖，先剥掉再匹配。 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** 抓 `from '...'` 与裸 `import '...'` 两种形式。 */
function specifiersOf(file) {
  const source = stripComments(readFileSync(file, 'utf8'))
  const specs = []
  const re = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source)) !== null) specs.push(m[1])
  const bareRe = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  while ((m = bareRe.exec(source)) !== null) specs.push(m[1])
  return specs
}

/**
 * @param {string} name 包名
 * @param {(spec: string) => string | null} rule 返回 null 表示允许，返回字符串表示违规原因
 */
function checkImports(name, rule) {
  const files = walk(join(pkg(name), 'src'))
  const violations = []
  for (const file of files) {
    for (const spec of specifiersOf(file)) {
      const reason = rule(spec)
      if (reason) violations.push(`${relative(root, file)} → ${spec}（${reason}）`)
    }
  }
  record(violations.length === 0, `${name} 源码依赖方向合法`)
  violations.forEach((v) => console.log(`    ${v}`))
}

const isInternal = (spec) => spec.startsWith('.')

// ---- 1. 源码级：依赖方向 -------------------------------------------------

checkImports('primflow-model', (spec) => {
  if (isInternal(spec)) return null
  return 'model 是零依赖的领域层，不得引用任何外部包'
})

checkImports('primflow-engine', (spec) => {
  if (isInternal(spec)) return null
  if (spec === '@lyx-pj/primflow-model') return null
  if (spec.startsWith('@lyx-pj/primflow-model/')) return '请从 model 的根入口导入，避免深层路径'
  return 'engine 只能依赖 model'
})

checkImports('primflow-canvas', (spec) => {
  if (isInternal(spec)) return null
  if (spec === '@lyx-pj/primflow-model') return null
  if (spec.startsWith('@lyx-pj/primflow-model/')) return '请从 model 的根入口导入，避免深层路径'
  if (spec === '@joint/core') return null
  if (spec === 'lit-html' || spec.startsWith('lit-html/')) return null
  if (spec.startsWith('@codemirror/')) return null
  if (spec.startsWith('@lezer/')) return null
  if (spec.startsWith('@lyx-pj/primflow-engine')) return 'canvas 不得依赖 engine（否则运行时状态会渗进画布层）'
  return 'canvas 只能依赖 model、@joint/core、lit-html、@codemirror/* 与 @lezer/*'
})

checkImports('primflow-react', (spec) => {
  if (isInternal(spec)) return null
  if (spec === '@lyx-pj/primflow-canvas' || spec === '@lyx-pj/primflow-engine') return null
  if (spec === '@lyx-pj/primflow-model') return null
  if (spec === 'react' || spec.startsWith('react/')) return null
  if (spec === 'react-dom' || spec.startsWith('react-dom/')) return null
  return 'react 适配层只允许依赖 model / engine / canvas / react'
})

// ---- 2. 类型声明级：.d.ts 不得泄漏跨层引用 --------------------------------

/** 每层允许出现的 @lyx-pj/* 声明依赖。 */
const DTS_ALLOWED = {
  'primflow-model': [],
  'primflow-engine': ['@lyx-pj/primflow-model'],
  'primflow-canvas': ['@lyx-pj/primflow-model'],
}

for (const [name, allowed] of Object.entries(DTS_ALLOWED)) {
  const dir = join(pkg(name), 'build/types')
  if (!existsSync(dir)) {
    record(false, `缺少类型声明 ${relative(root, dir)}，请先执行 pnpm build`)
    continue
  }
  const leaks = []
  for (const file of walk(dir)) {
    const source = stripComments(readFileSync(file, 'utf8'))
    const re = /from\s+['"](@lyx-pj\/[^'"]+)['"]/g
    let m
    while ((m = re.exec(source)) !== null) {
      if (!allowed.includes(m[1])) {
        leaks.push(`${relative(root, file)} → ${m[1]}`)
      }
    }
  }
  record(leaks.length === 0, `${name} 类型声明未泄漏跨层引用`)
  leaks.forEach((v) => console.log(`    ${v}`))
}

// ---- 3. 产物级：external 是否生效 ----------------------------------------



function checkBundle(name, entry, predicate) {
  const path = join(pkg(name), entry)
  const code = readIfExists(path)
  if (code === null) {
    record(false, `缺少构建产物 ${relative(root, path)}，请先执行 pnpm build`)
    return
  }
  record(predicate(code), `${name} 构建产物边界合法`)
}

const externalImports = (code) => {
  const specs = []
  const re = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(code)) !== null) specs.push(m[1])
  const bareRe = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  while ((m = bareRe.exec(code)) !== null) specs.push(m[1])
  return [...new Set(specs)]
}

checkBundle('primflow-model', 'build/index.mjs', (code) => {
  const specs = externalImports(code)
  record(specs.length === 0, 'model 产物无外部 import')
  return true
})

checkBundle('primflow-engine', 'build/index.mjs', (code) => {
  const specs = externalImports(code)
  const unexpected = specs.filter((s) => s !== '@lyx-pj/primflow-model')
  record(unexpected.length === 0, `engine 产物只 external model（发现：${unexpected.join(', ') || '无'}）`)
  record(!/\bdocument\b/.test(code), 'engine 产物不含 DOM 引用（document）')
  record(!/\bwindow\b/.test(code), 'engine 产物不含 DOM 引用（window）')
  record(!/@joint\/core/.test(code), 'engine 产物不含 @joint/core')
  return true
})

checkBundle('primflow-canvas', 'build/index.mjs', (code) => {
  const specs = externalImports(code)
  record(specs.includes('@lyx-pj/primflow-model'), 'canvas 产物把 model 作为外部依赖引用')
  record(specs.includes('@joint/core'), 'canvas 产物把 @joint/core 作为外部依赖引用')
  record(specs.some((s) => s === 'lit-html' || s.startsWith('lit-html/')), 'canvas 产物把 lit-html 作为外部依赖引用')
  record(specs.some((s) => s.startsWith('@codemirror/')), 'canvas 产物把 @codemirror/* 作为外部依赖引用')
  const unexpected = specs.filter(
    (s) =>
      s !== '@lyx-pj/primflow-model' &&
      s !== '@joint/core' &&
      s !== 'lit-html' &&
      !s.startsWith('lit-html/') &&
      !s.startsWith('@codemirror/') &&
      !s.startsWith('@lezer/')
  )
  record(unexpected.length === 0, `canvas 产物无其它外部依赖（发现：${unexpected.join(', ') || '无'}）`)
  record(!/vendor-[\w-]+\.js/.test(code), 'canvas 产物不再产出内联 vendor chunk')
  return true
})

checkBundle('primflow-react', 'build/index.es.js', (code) => {
  const sizeKb = statSync(join(pkg('primflow-react'), 'build/index.es.js')).size / 1024
  record(sizeKb < 20, `react 适配层产物 ${sizeKb.toFixed(2)}kB < 20kB（防止把下层内联回来）`)
  record(!/BlueprintNode/.test(code), 'react 适配层不含 canvas 内部实现（BlueprintNode）')
  record(!/\bjoint\b/i.test(code), 'react 适配层不含 JointJS')
  const specs = externalImports(code)
  record(specs.includes('@lyx-pj/primflow-canvas'), 'react 适配层把 canvas 作为外部依赖引用')
  record(!specs.includes('@lyx-pj/primflow-engine'), 'react 适配层由应用创建引擎，无需在运行时导入 engine')
  record(specs.some((s) => s.startsWith('react/')), 'react 适配层把 react/jsx-runtime 作为外部依赖引用')
  return true
})

checkBundle('primflow-react', 'build/index.d.ts', (code) => {
  return externalImports(code).includes('@lyx-pj/primflow-engine')
})

// ---- 4. 交叉内联：产物不得含对方层的实现特征 ------------------------------

// 这些标识符是各层独有的实现细节；一旦出现在别的产物里，说明打包器把对方内联了，
// 运行时就会冒出第二份实现（即使 import 语句看起来是干净的）。
// 注意：各层的指纹互斥。flowStackGraph 是 engine 自己的实现细节，
// 所以它出现在 engine 产物里是正常的，出现在 canvas 产物里才是内联。
const FINGERPRINTS = {
  'primflow-model': ['BlueprintNode', 'flowStackGraph', '@joint/core'],
  // engine 的黑名单只能是「canvas 独有」的实现；flowStackGraph / executeSubgraph
  // 本来就是 engine 自己的，出现在这里属于正常。
  'primflow-engine': ['BlueprintNode', '@joint/core'],
  'primflow-canvas': ['flowStackGraph', 'subWaitingGraph', 'portConnectionValueMap', 'executeSubgraph'],
}

for (const [name, marks] of Object.entries(FINGERPRINTS)) {
  const code = readIfExists(join(pkg(name), 'build/index.mjs'))
  if (code === null) continue
  const hit = marks.filter((mark) => code.includes(mark))
  record(hit.length === 0, `${name} 产物未内联其它层的实现（命中：${hit.join(', ') || '无'}）`)
}

if (failures.length > 0) {
  console.error(`\n✗ 包边界校验失败（${failures.length} 项）：`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('\n✓ 包边界校验通过')
