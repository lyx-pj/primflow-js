import { beforeEach } from 'vitest'
import { setLanguage } from '../packages/workflow/i18n'

// Existing assertions use Chinese business copy as the baseline; new feature tests switch to English and back.
beforeEach(() => {
  setLanguage('zh')
})
