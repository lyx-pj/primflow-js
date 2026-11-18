import { execFileSync } from 'node:child_process'
import { validateReleaseSnapshot } from './release-version'

try {
  const subject = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf8' }).trim()
  const version = validateReleaseSnapshot(process.cwd(), process.env.RELEASE_REF ?? '', subject)
  console.log(`已验证发布快照 v${version}`)
} catch (error) {
  console.error('发布快照校验失败：', error)
  process.exitCode = 1
}
