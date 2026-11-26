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
const tag = 'v0.0.7'
const ref = `refs/tags/${tag}`
const createTag = `git tag -a ${tag} -m Release ${tag}`
const push = `git push --atomic --no-follow-tags origin released:refs/heads/main tag-object:${ref}`
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
    if (args[0] === 'ls-remote') return state.remote ? `${state.remote}\t${args.at(-1)}\n` : ''
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
    if (key === createTag) {
      state.refs[ref] = 'tag-object'
      state.refs[`${ref}^{commit}`] = state.head
    }
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
  state.refs[ref] = 'tag-object'
  state.refs[`${ref}^{commit}`] = state.head
}

describe('发布流程', () => {
  it('构建后提交并创建附注 tag，npm 成功后只原子推送 main 和本次 tag', () => {
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(readJson('package.json').version).toBe('0.0.7')
    expect(readReleaseVersion(root)).toBe('0.0.7')
    expect(state.refs[`${ref}^{commit}`]).toBe('released')
    expect(commands()).not.toContain('pnpm sync-versions')
    expect(commands().indexOf('pnpm build')).toBeLessThan(commands().indexOf(commit))
    expect(commands().indexOf(commit)).toBeLessThan(commands().indexOf(createTag))
    expect(commands().indexOf(createTag)).toBeLessThan(commands().indexOf(publish))
    expect(commands().at(-1)).toBe(push)
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

  it.each(['local', 'remote'])('%s 同名版本 tag 冲突时不发布', (where) => {
    if (where === 'local') state.refs[ref] = 'other'
    else state.remote = 'other'
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
    expect(commands()).not.toContain(commit)
  })

  it('引用查询错误不能被当作 tag 不存在', () => {
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
    `git ls-remote --refs origin ${ref}`,
    'pnpm build',
    commit,
    createTag,
    publish,
    push,
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
    expect(state.refs[`${ref}^{commit}`]).toBe('released')
    expect(commands().some((cmd) => cmd.startsWith('git push'))).toBe(false)
    state.fail = ''
    process.exitCode = undefined
    execFileSync.mockClear()
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain('pnpm changeset version')
    expect(commands()).not.toContain(commit)
    expect(commands()).not.toContain(createTag)
    expect(commands()).toContain(publish)
    expect(commands().at(-1)).toContain('git push --atomic')
  })

  it('推送失败后重跑复用同一快照', () => {
    state.fail = push
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

  it('重试时复用已经推送的同一个附注 tag', () => {
    prepareRetry()
    state.remote = state.refs[ref]
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain(commit)
    expect(commands()).not.toContain(createTag)
    expect(commands().at(-1)).toBe(push)
  })

  it('本地 tag 指向不同提交时停止发布', () => {
    prepareRetry()
    state.refs[`${ref}^{commit}`] = 'other'
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
  })

  it('提交成功但创建 tag 失败后，重跑补建 tag 并复用提交', () => {
    state.fail = createTag
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands()).not.toContain(publish)
    state.fail = ''
    process.exitCode = undefined
    execFileSync.mockClear()
    release(root)
    expect(process.exitCode).toBeUndefined()
    expect(commands()).not.toContain('pnpm changeset version')
    expect(commands()).not.toContain(commit)
    expect(commands()).toContain(createTag)
    expect(commands().at(-1)).toBe(push)
  })

  it('npm 发布期间快照改变时停止推送', () => {
    state.onPublish = () => {
      state.head = 'unexpected'
    }
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands().some((cmd) => cmd.startsWith('git push'))).toBe(false)
  })

  it('npm 发布期间同名 tag 被替换时停止推送', () => {
    state.onPublish = () => {
      state.refs[ref] = 'replacement-tag-object'
    }
    release(root)
    expect(process.exitCode).toBe(1)
    expect(commands().some((cmd) => cmd.startsWith('git push'))).toBe(false)
  })
})

describe('Pages 发布快照', () => {
  it('允许匹配的 tag、提交和统一版本', () => {
    prepareRetry()
    expect(validateReleaseSnapshot(root, tag, state.subject)).toBe('0.0.7')
  })
  it.each([
    ['main', 'chore(release): v0.0.7'],
    ['release/v0.0.7', 'chore(release): v0.0.7'],
    ['v0.0.8', 'chore(release): v0.0.7'],
    ['v0.0.7', 'feat: change'],
  ])('拒绝不匹配的 tag %s 或提交 %s', (name, subject) => {
    prepareRetry()
    expect(() => validateReleaseSnapshot(root, name, subject)).toThrow()
  })
  it('根版本不一致时不能部署', () => {
    prepareRetry()
    writeJson('package.json', { version: '0.0.6' })
    expect(() => validateReleaseSnapshot(root, tag, state.subject)).toThrow()
  })
  it('预发布版本不能进入当前稳定版发布流程', () => {
    for (const name of releasePackages) writeJson(`packages/${name}/package.json`, { version: '0.0.7-beta.1' })
    expect(() => readReleaseVersion(root)).toThrow('稳定版本')
  })
  it('workflow 自动部署版本 tag 并校验该提交的快照', () => {
    const workflow = readFileSync(join(repository, '.github/workflows/pages.yml'), 'utf8')
    expect(workflow).toContain("tags: ['v*']")
    expect(workflow).not.toMatch(/^\s+branches:/m)
    expect(workflow).toContain("github.ref_type == 'tag'")
    expect(workflow).toContain("github.event.deleted != true")
    expect(workflow).toContain('|| github.sha }}')
    expect(workflow).toContain('pnpm exec tsx scripts/validate-release.ts')
  })

  it('workflow 从 main 手动部署时以指定 tag 检出并校验发布快照', () => {
    const workflow = readFileSync(join(repository, '.github/workflows/pages.yml'), 'utf8')

    expect(workflow).toContain('workflow_dispatch:\n    inputs:\n      release_tag:')
    expect(workflow).toContain("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.release_tag != ''")
    expect(workflow).toContain("format('refs/tags/{0}', inputs.release_tag)")
    expect(workflow).toContain('RELEASE_REF: ${{ inputs.release_tag || github.ref_name }}')
  })

  it('Pages 产物在独立的构建任务上传，部署等待构建完成', () => {
    const workflow = readFileSync(join(repository, '.github/workflows/pages.yml'), 'utf8')
    const jobs = workflow.split('\njobs:\n')[1]
    const [build, deploy] = jobs.split('\n  deploy:\n')

    expect(build).toMatch(/^  build:\n/)
    expect(build).toContain('uses: actions/upload-pages-artifact@v5')
    expect(build).not.toContain('uses: actions/deploy-pages@')
    expect(deploy).toMatch(/^    needs: build$/m)
    expect(deploy).toContain('uses: actions/deploy-pages@v5')
    expect(deploy).not.toContain('uses: actions/upload-pages-artifact@')
  })

  it('Pages 首次部署未返回 URL 时可重试，未恢复的失败产生失败状态', () => {
    const workflow = readFileSync(join(repository, '.github/workflows/pages.yml'), 'utf8')
    const retryCondition = "steps.deployment.outcome == 'failure' && steps.deployment.outputs.page_url == ''"

    expect(workflow).toContain('id: deployment\n        continue-on-error: true')
    expect(workflow).toContain(`id: deployment_retry\n        if: ${retryCondition}`)
    expect(workflow).toContain("if: steps.deployment.outcome == 'failure' && steps.deployment_retry.outcome != 'success'\n        run: exit 1")
    expect(workflow).toContain('steps.deployment_retry.outputs.page_url || steps.deployment.outputs.page_url')
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
