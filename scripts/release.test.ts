// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { execSync } = vi.hoisted(() => ({ execSync: vi.fn() }))
vi.mock('node:child_process', () => ({ execSync }))

const originalExitCode = process.exitCode

beforeEach(() => {
  vi.resetModules()
  execSync.mockReset()
  execSync.mockReturnValue('')
  process.exitCode = undefined
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  process.exitCode = originalExitCode
  vi.restoreAllMocks()
})

const commands = () => execSync.mock.calls.map(([command]) => command)
const publish = 'pnpm publish -r --access public --registry https://registry.npmjs.org/'
const commit = 'git add . && git commit -m "chore: bump versions [skip ci]"'

describe('发布流程', () => {
  it('没有版本改动时跳过提交，继续构建、发布和推送', async () => {
    await import('./release')

    expect(commands()).toContain('pnpm build')
    expect(commands()).toContain(publish)
    expect(commands()).toContain('git push --follow-tags')
    expect(commands()).not.toContain(commit)
    expect(process.exitCode).toBeUndefined()
  })

  it('保留 Changesets 生成的版本，构建通过后才提交', async () => {
    let statusChecks = 0
    execSync.mockImplementation((command) => {
      if (command === 'git status --porcelain') {
        return statusChecks++ === 0 ? '' : ' M packages/workflow-model/package.json\n'
      }
      return ''
    })

    await import('./release')

    expect(commands()).toContain('pnpm changeset version')
    expect(commands()).not.toContain('pnpm sync-versions')
    expect(commands()).toContain(commit)
    expect(commands().indexOf('pnpm build')).toBeLessThan(commands().indexOf(commit))
    expect(commands().indexOf(commit)).toBeLessThan(commands().indexOf(publish))
  })

  it('工作区已有改动时停止，避免把无关文件加入发布提交', async () => {
    execSync.mockReturnValue('?? unrelated.txt\n')

    await import('./release')

    expect(commands()).toEqual(['git status --porcelain'])
    expect(process.exitCode).toBe(1)
    expect(console.error).toHaveBeenCalled()
  })

  it.each([
    'pnpm lint',
    'pnpm test',
    'pnpm typecheck',
    'pnpm changeset version',
    'pnpm build',
    commit,
    publish,
    'git push --follow-tags',
  ])('%s 失败时返回非零退出码，且不执行后续步骤', async (failedCommand) => {
    let statusChecks = 0
    const error = new Error('模拟命令失败')
    execSync.mockImplementation((command) => {
      if (command === failedCommand) throw error
      if (command === 'git status --porcelain') {
        return statusChecks++ === 0 ? '' : ' M packages/workflow-model/package.json\n'
      }
      return ''
    })

    await import('./release')

    expect(commands().at(-1)).toBe(failedCommand)
    expect(process.exitCode).toBe(1)
    expect(console.error).toHaveBeenCalledWith('❌ 发布失败：', error)
    expect(console.log).not.toHaveBeenCalledWith('✅ 发布完成')
  })
})
