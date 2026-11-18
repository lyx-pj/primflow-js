// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { release } from './release'
import { readReleaseVersion, releasePackages, validateReleaseSnapshot } from './release-version'

const { execFileSync } = vi.hoisted(() => ({ execFileSync: vi.fn() }))
vi.mock('node:child_process', () => ({ execFileSync }))
const actualChild = await vi.importActual<typeof import('node:child_process')>('node:child_process')
const repository = resolve(import.meta.dirname, '..')
const originalExitCode = process.exitCode
const publish = 'pnpm publish -r --access public --registry https://registry.npmjs.org/'
const commit = 'git commit -m chore(release): v0.0.7'
const ref = 'refs/heads/release/v0.0.7'
let root: string
let state: {
  bump: boolean
  dirty: boolean
  head: string
  subject: string
  branch: string
  refs: Record<string, string>
  remote: string
  extraPaths: string[]
  fail: string
  onBuild?: () => void
  onPublish?: () => void
}
const writeJson = (path: string, data: unknown) => writeFileSync(join(root, path), JSON.stringify(data, null, 2))
const readJson = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const commands = () => execFileSync.mock.calls.map(([command, args]) => [command, ...args].join(' '))
const paths = () =>
  state.dirty
    ? ['package.json', ...releasePackages.map((name) => `packages/${name}/package.json`), ...state.extraPaths].sort()
    : []
const error = (status = 1) => Object.assign(new Error('模拟命令失败'), { status })

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'workflow-release-'))
  mkdirSync(join(root, '.changeset'))
  writeJson('package.json', { name: 'release-fixture', private: true, version: '0.0.6' })
  for (const name of releasePackages) {
    mkdirSync(join(root, 'packages', name), { recursive: true })
    writeJson(`packages/${name}/package.json`, { name: `@lyx-pj/${name}`, version: '0.0.6' })
  }
  state = {
    bump: true,
    dirty: false,
    head: 'initial',
    subject: 'feat: change',
    branch: 'main',
    refs: {},
    remote: '',
    extraPaths: [],
    fail: '',
  }
  process.exitCode = undefined
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  execFileSync.mockReset()
  execFileSync.mockImplementation((command: string, args: string[]) => {
    const key = [command, ...args].join(' ')
    if (key === state.fail) throw error()
    if (key === 'git status --porcelain') return state.dirty ? ' M package.json' : ''
    if (key === 'git branch --show-current') return state.branch
    if (key === 'git config --get branch.main.remote') return 'origin'
    if (key === 'git config --get branch.main.merge') return 'refs/heads/main'
    if (key === 'git rev-parse HEAD') return state.head
    if (key === 'git log -1 --format=%s') return state.subject
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const value = state.refs[args.at(-1)!]
      if (!value) throw error()
      return value
    }
    if (args[0] === 'ls-remote') return state.remote ? `${state.remote}\t${args[2]}\n` : ''
    if (args[0] === 'ls-files') return ''
    if (args[0] === 'diff') return paths().join('\0') + (state.dirty ? '\0' : '')
    if (key === 'pnpm changeset version' && state.bump) {
      for (const name of releasePackages)
        writeJson(`packages/${name}/package.json`, { name: `@lyx-pj/${name}`, version: '0.0.7' })
      state.dirty = true
    }
    if (key === 'pnpm build') state.onBuild?.()
    if (key === commit) {
      state.head = 'released'
      state.subject = 'chore(release): v0.0.7'
      state.dirty = false
    }
    if (command === 'git' && args[0] === 'branch') state.refs[`refs/heads/${args[1]}`] = state.head
    if (key === publish) state.onPublish?.()
    return ''
  })
})

afterEach(() => {
  process.exitCode = originalExitCode
  vi.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

function prepareRetry() {
  for (const name of releasePackages)
    writeJson(`packages/${name}/package.json`, { name: `@lyx-pj/${name}`, version: '0.0.7' })
  writeJson('package.json', { name: 'release-fixture', private: true, version: '0.0.7' })
  state.head = 'released'
  state.subject = 'chore(release): v0.0.7'
  state.refs[ref] = state.head
}

describe('发布流程', () => {
  it('自动同步统一版本，构建后提交并创建分支，npm 成功后才原子推送', () => {
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(readJson('package.json').version).toBe('0.0.7')
    expect(readReleaseVersion(root)).toBe('0.0.7')
    expect(state.refs[ref]).toBe('released')
    expect(commands()).not.toContain('pnpm sync-versions')
    expect(commands().indexOf('pnpm build')).toBeLessThan(commands().indexOf(commit))
    expect(commands().indexOf(commit)).toBeLessThan(commands().indexOf(publish))
    expect(commands().at(-1)).toBe(
      `git push --atomic --follow-tags --force-with-lease=${ref}: origin HEAD:refs/heads/main ${ref}:${ref}`
    )
    expect(execFileSync.mock.calls.every(([, , options]) => options.cwd === root)).toBe(true)
  })

  it('没有版本变化时不提交、不发布、不推送', () => {
    state.bump = false
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain(publish)
    expect(commands().some((cmd) => cmd.startsWith('git push') || cmd.startsWith('git commit'))).toBe(false)
  })

  it('已有工作区改动时立即停止', () => {
    state.dirty = true
    release(root)
    expect(commands()).toEqual(['git status --porcelain'])
    expect(process.exitCode).toBe(1)
  })

  it('非 main 分支不能发布', () => {
    state.branch = 'feature'
    release(root)
    expect(commands()).not.toContain('pnpm changeset version')
    expect(process.exitCode).toBe(1)
  })

  it.each(['local', 'remote'])('%s 同名版本分支冲突时不发布', (where) => {
    if (where === 'local') state.refs[ref] = 'other'
    else state.remote = 'other'
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
    expect(commands()).not.toContain(commit)
  })

  it('引用查询错误不能被当作分支不存在', () => {
    const implementation = execFileSync.getMockImplementation()!
    execFileSync.mockImplementation((command, args, options) => {
      if (args[0] === 'rev-parse' && args[1] === '--verify') throw error(128)
      return implementation(command, args, options)
    })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
  })

  it.each([
    'git fetch origin refs/heads/main',
    'git merge-base --is-ancestor FETCH_HEAD HEAD',
    'pnpm lint',
    'pnpm test',
    'pnpm typecheck',
    'pnpm changeset version',
    `git ls-remote origin ${ref}`,
    'pnpm build',
    commit,
    'git branch release/v0.0.7',
    publish,
    `git push --atomic --follow-tags --force-with-lease=${ref}: origin HEAD:refs/heads/main ${ref}:${ref}`,
  ])('%s 失败后不执行后续命令', (failed) => {
    state.fail = failed
    release(root)
    expect(commands().at(-1)).toBe(failed)
    expect(process.exitCode).toBe(1)
    expect(console.log).not.toHaveBeenCalledWith('✅ 发布完成')
  })

  it('构建引入无关文件时不暂存或提交', () => {
    state.onBuild = () => {
      state.extraPaths.push('unrelated.txt')
      writeFileSync(join(root, 'unrelated.txt'), 'unrelated')
    }
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands().some((cmd) => cmd.startsWith('git add'))).toBe(false)
    expect(commands()).not.toContain(publish)
  })

  it('构建修改已生成的文件时也停止', () => {
    state.onBuild = () => writeJson('package.json', { ...readJson('package.json'), unexpected: true })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(commit)
  })

  it('无变化却出现文件改动时停止', () => {
    state.bump = false
    const implementation = execFileSync.getMockImplementation()!
    execFileSync.mockImplementation((command, args, options) => {
      const result = implementation(command, args, options)
      if (command === 'pnpm' && args[0] === 'changeset') state.dirty = true
      return result
    })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
  })

  it('库包版本不一致时停止', () => {
    writeJson('packages/primflow-model/package.json', { version: '0.0.9' })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain('pnpm changeset version')
    expect(commands()).not.toContain(publish)
  })

  it('升版后库版本不一致时停止，不用根版本覆盖结果', () => {
    const implementation = execFileSync.getMockImplementation()!
    execFileSync.mockImplementation((command, args, options) => {
      const result = implementation(command, args, options)
      if (command === 'pnpm' && args[0] === 'changeset') {
        writeJson('packages/primflow-react/package.json', { version: '0.0.8' })
      }
      return result
    })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(readJson('package.json').version).toBe('0.0.6')
    expect(commands()).not.toContain(commit)
    expect(commands()).not.toContain(publish)
  })

  it('暂存区夹带额外文件时不提交', () => {
    const implementation = execFileSync.getMockImplementation()!
    execFileSync.mockImplementation((command, args, options) => {
      if (args[0] === 'diff' && args[1] === '--cached') return `${paths().join('\0')}\0unrelated.txt\0`
      return implementation(command, args, options)
    })
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(commit)
    expect(commands()).not.toContain(publish)
  })

  it('npm 失败后重跑复用同一快照，不再次升版或提交', () => {
    state.fail = publish
    release(root)
    expect(process.exitCode).toBe(1)
    expect(state.refs[ref]).toBe('released')
    expect(commands().some((cmd) => cmd.startsWith('git push'))).toBe(false)
    state.fail = ''
    process.exitCode = undefined
    execFileSync.mockClear()
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain('pnpm changeset version')
    expect(commands()).not.toContain(commit)
    expect(commands()).toContain(publish)
    expect(commands().at(-1)).toContain('git push --atomic')
  })

  it('推送失败后重跑复用同一快照', () => {
    state.fail = `git push --atomic --follow-tags --force-with-lease=${ref}: origin HEAD:refs/heads/main ${ref}:${ref}`
    release(root)
    expect(process.exitCode).toBe(1)
    state.fail = ''
    process.exitCode = undefined
    execFileSync.mockClear()
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain(commit)
    expect(commands()).not.toContain('pnpm changeset version')
  })

  it('已推送的同一版本使用既有引用作为约束，不移动分支', () => {
    prepareRetry()
    state.remote = state.head
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain(commit)
    expect(commands().at(-1)).toContain(`--force-with-lease=${ref}:released`)
  })

  it('npm 发布期间快照改变时停止推送', () => {
    state.onPublish = () => {
      state.head = 'unexpected'
    }
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands().some((cmd) => cmd.startsWith('git push'))).toBe(false)
  })
})

describe('Pages 发布快照', () => {
  it('允许匹配的发布分支、提交和统一版本', () => {
    prepareRetry()
    expect(validateReleaseSnapshot(root, 'release/v0.0.7', state.subject)).toBe('0.0.7')
  })
  it.each([
    ['main', 'chore(release): v0.0.7'],
    ['release/v0.0.8', 'chore(release): v0.0.7'],
    ['release/v0.0.7', 'feat: change'],
  ])('拒绝不匹配的分支 %s 或提交 %s', (branch, subject) => {
    prepareRetry()
    expect(() => validateReleaseSnapshot(root, branch, subject)).toThrow()
  })
  it('根版本不一致时不能部署', () => {
    prepareRetry()
    writeJson('package.json', { version: '0.0.6' })
    expect(() => validateReleaseSnapshot(root, 'release/v0.0.7', state.subject)).toThrow()
  })
  it('预发布版本不能进入当前稳定版发布流程', () => {
    for (const name of releasePackages) writeJson(`packages/${name}/package.json`, { version: '0.0.7-beta.1' })
    expect(() => readReleaseVersion(root)).toThrow('稳定版本')
  })
  it('workflow 仅监听版本分支、保留手动入口并校验 checkout 的快照', () => {
    const workflow = readFileSync(join(repository, '.github/workflows/pages.yml'), 'utf8')
    expect(workflow).toContain("branches: ['release/v*']")
    expect(workflow).not.toContain('branches: [main]')
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('ref: ${{ github.sha }}')
    expect(workflow).toContain('pnpm exec tsx scripts/validate-release.ts')
    expect(workflow).toContain('RELEASE_REF: ${{ github.ref_name }}')
  })
})

it('真实 Changesets 根据单包 changeset 将四库一起升级到同一版本', () => {
  const require = createRequire(import.meta.url)
  const config = JSON.parse(readFileSync(join(repository, '.changeset/config.json'), 'utf8'))
  writeJson('.changeset/config.json', { ...config, changelog: false })
  for (const name of releasePackages) {
    const manifest = JSON.parse(readFileSync(join(repository, 'packages', name, 'package.json'), 'utf8'))
    writeJson(`packages/${name}/package.json`, { ...manifest, version: '0.0.6' })
  }
  mkdirSync(join(root, 'examples/primflow-react'), { recursive: true })
  const example = JSON.parse(readFileSync(join(repository, 'examples/primflow-react/package.json'), 'utf8'))
  writeJson('examples/primflow-react/package.json', example)
  writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n  - 'examples/*'\n")
  writeFileSync(
    join(root, '.changeset/one-package.md'),
    '---\n"@lyx-pj/primflow-model": minor\n---\n\nChange one package.\n'
  )
  actualChild.execFileSync(process.execPath, [require.resolve('@changesets/cli/bin.js'), 'version'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', COLUMNS: '80', LINES: '24' },
  })
  // 保留 Changesets 对 peerDependencies 的默认升级规则，最终统一到最高升级级别。
  expect(readReleaseVersion(root)).toBe('1.0.0')
  expect(readJson('examples/primflow-react/package.json')).toEqual(example)
})
