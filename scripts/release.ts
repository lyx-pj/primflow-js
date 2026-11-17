import { execSync } from 'node:child_process'

const hasChanges = () => execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0
const run = (command: string) => execSync(command, { stdio: 'inherit' })

try {
  // 发布提交只能包含本次流程生成的文件，不能夹带已有改动。
  if (hasChanges()) {
    throw new Error('工作区有未提交的改动，请先提交或使用 git stash 保存后再发布。')
  }

  run('pnpm lint')
  run('pnpm test')
  run('pnpm typecheck')

  // Changesets 负责各包版本和内部依赖，不再用根版本覆盖其结果。
  run('pnpm changeset version')
  run('pnpm build')

  // 重试发布时可能没有新 changeset；空提交不能阻止后续发布。
  if (hasChanges()) {
    run('git add . && git commit -m "chore: bump versions [skip ci]"')
  } else {
    console.log('没有版本改动，跳过 Git 提交。')
  }

  run('pnpm publish -r --access public --registry https://registry.npmjs.org/')
  run('git push --follow-tags')

  console.log('✅ 发布完成')
} catch (e) {
  console.error('❌ 发布失败：', e)
  process.exitCode = 1
}
