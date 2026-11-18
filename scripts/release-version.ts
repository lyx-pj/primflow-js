import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const releasePackages = ['primflow-model', 'primflow-engine', 'primflow-canvas', 'primflow-react']

export const readPackage = (root: string, path = 'package.json') => JSON.parse(readFileSync(join(root, path), 'utf8'))

export function readReleaseVersion(root: string): string {
  const versions = releasePackages.map((name) => readPackage(root, `packages/${name}/package.json`).version)
  const version = versions[0]
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('发布版本必须为有效的稳定版本号 X.Y.Z。')
  }
  if (!versions.every((value) => value === version)) {
    throw new Error('四个库包的版本不一致，请检查 Changesets fixed 分组。')
  }
  return version
}

export function validateReleaseSnapshot(root: string, tag: string, subject: string): string {
  const version = readReleaseVersion(root)
  if (readPackage(root).version !== version || tag !== `v${version}` || subject !== `chore(release): v${version}`) {
    throw new Error('发布 tag、提交标题和根目录及四个库包的版本必须一致。')
  }
  return version
}
