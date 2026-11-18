import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPackage, readReleaseVersion, releasePackages, validateReleaseSnapshot } from './release-version'

export function release(root = process.cwd()): void {
  const read = (command: string, args: string[]) =>
    execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
  const run = (command: string, args: string[]) => execFileSync(command, args, { cwd: root, stdio: 'inherit' })
  const git = (...args: string[]) => read('git', args)
  const hasChanges = () => git('status', '--porcelain').length > 0
  const localRef = (ref: string) => {
    // --verify 的退出码 1 表示引用不存在，其他错误不能被当作不存在。
    try {
      return git('rev-parse', '--verify', '--quiet', ref)
    } catch (error) {
      if ((error as { status?: number }).status === 1) return ''
      throw error
    }
  }
  const changedPaths = () =>
    [
      ...new Set(
        [
          ...git('diff', '--name-only', '--no-renames', '-z', 'HEAD').split('\0'),
          ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
        ].filter(Boolean)
      ),
    ].sort()
  const snapshot = (paths: string[]) =>
    JSON.stringify(
      paths.map((path) => [
        path,
        existsSync(join(root, path))
          ? createHash('sha256')
              .update(readFileSync(join(root, path)))
              .digest('hex')
          : null,
      ])
    )

  try {
    if (hasChanges()) throw new Error('工作区有未提交的改动，请先提交或使用 git stash 保存后再发布。')
    if (git('branch', '--show-current') !== 'main') throw new Error('请从 main 分支发布。')
    const remote = git('config', '--get', 'branch.main.remote')
    if (!remote || remote === '.' || git('config', '--get', 'branch.main.merge') !== 'refs/heads/main') {
      throw new Error('main 必须跟踪远端 main 分支。')
    }
    run('git', ['fetch', remote, 'refs/heads/main'])
    run('git', ['merge-base', '--is-ancestor', 'FETCH_HEAD', 'HEAD'])

    const previousVersion = readReleaseVersion(root)
    const initialHead = git('rev-parse', 'HEAD')
    const pendingChangesets = readdirSync(join(root, '.changeset')).some(
      (name) => name.endsWith('.md') && name !== 'README.md'
    )
    const retry =
      !pendingChangesets &&
      readPackage(root).version === previousVersion &&
      git('log', '-1', '--format=%s') === `chore(release): v${previousVersion}`

    run('pnpm', ['lint'])
    run('pnpm', ['test'])
    run('pnpm', ['typecheck'])
    if (!retry) run('pnpm', ['changeset', 'version'])
    const version = readReleaseVersion(root)
    if (!retry && version === previousVersion) {
      if (hasChanges()) throw new Error('版本未升级但工作区发生了变化，请检查版本文件后重试。')
      console.log('没有待发布的版本，跳过发布和推送。')
      return
    }
    if (!retry) {
      const before = previousVersion.split('.').map(BigInt)
      const after = version.split('.').map(BigInt)
      const index = after.findIndex((part, i) => part !== before[i])
      if (index < 0 || after[index] < before[index]) throw new Error('新版本必须高于当前版本。')
      const pkg = readPackage(root)
      pkg.version = version
      writeFileSync(join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
    }

    const tag = `v${version}`
    const ref = `refs/tags/${tag}`
    const existingTag = localRef(ref)
    const remoteTag = git('ls-remote', '--refs', remote, ref).split(/\s/)[0]
    if (
      (existingTag && (!retry || localRef(`${ref}^{commit}`) !== initialHead)) ||
      (remoteTag && (!retry || remoteTag !== existingTag))
    ) {
      throw new Error(`${tag} 已存在且与本次发布不一致，请先核对本地和远端 tag。`)
    }

    const paths = changedPaths()
    const allowed = new Set([
      'package.json',
      'pnpm-lock.yaml',
      ...releasePackages.flatMap((name) => [`packages/${name}/package.json`, `packages/${name}/CHANGELOG.md`]),
    ])
    if (paths.some((path) => !allowed.has(path) && !/^\.changeset\/[^/]+\.md$/.test(path))) {
      throw new Error('版本流程产生了非预期文件，请检查后重试。')
    }
    const generated = snapshot(paths)
    run('pnpm', ['build'])
    if (JSON.stringify(changedPaths()) !== JSON.stringify(paths) || snapshot(paths) !== generated) {
      throw new Error('构建修改了发布文件或产生了无关改动，已停止提交。')
    }
    if (!retry) {
      run('git', ['add', '--', ...paths])
      if (
        JSON.stringify(git('diff', '--cached', '--name-only', '-z').split('\0').filter(Boolean).sort()) !==
        JSON.stringify(paths)
      ) {
        throw new Error('暂存区与版本流程生成的文件不一致。')
      }
      run('git', ['commit', '-m', `chore(release): ${tag}`])
    }
    const releaseHead = git('rev-parse', 'HEAD')
    validateReleaseSnapshot(root, tag, git('log', '-1', '--format=%s'))
    if (!existingTag) run('git', ['tag', '-a', tag, '-m', `Release ${tag}`])
    const tagObject = localRef(ref)
    if (
      !tagObject ||
      (existingTag && tagObject !== existingTag) ||
      localRef(`${ref}^{commit}`) !== releaseHead ||
      hasChanges()
    ) {
      throw new Error('发布 tag 或工作区发生了变化。')
    }

    run('pnpm', ['publish', '-r', '--access', 'public', '--registry', 'https://registry.npmjs.org/'])
    if (git('rev-parse', 'HEAD') !== releaseHead || localRef(ref) !== tagObject || hasChanges()) {
      throw new Error('npm 发布期间快照发生了变化，已停止推送。')
    }
    // 使用已验证的对象推送，避免带上无关的本地 tag。
    run('git', [
      'push',
      '--atomic',
      '--no-follow-tags',
      remote,
      `${releaseHead}:refs/heads/main`,
      `${tagObject}:${ref}`,
    ])
    console.log('✅ 发布完成')
  } catch (error) {
    console.error('❌ 发布失败（保留现场，请检查后重试）：', error)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) release()
