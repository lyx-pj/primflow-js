import { afterEach, expect, test, vi } from 'vitest'
import { translate } from '../src/ui/i18n'

afterEach(() => vi.unstubAllGlobals())

test('uses the explicit language and interpolates values', () => {
  expect(translate('Undo', 'zh')).toBe('撤销')
  expect(translate('Undo', 'en')).toBe('Undo')
  expect(translate('Current zoom {percent}%, reset to 100%', 'zh', { percent: 75 }))
    .toBe('当前缩放 75%，重置为 100%')
})

test.each(['zh-CN', 'zh-TW', 'en-US', 'ja'])('ignores browser language %s and defaults to English', (language) => {
  vi.stubGlobal('navigator', { language, languages: [language] })
  expect(translate('Undo')).toBe('Undo')
  expect(translate('Undo', 'en')).toBe('Undo')
  expect(translate('Undo', 'zh')).toBe('撤销')
})

test('works without a browser and preserves application text', () => {
  vi.stubGlobal('navigator', undefined)
  expect(translate('Undo')).toBe('Undo')
  expect(translate('Undo', 'zh')).toBe('撤销')
  expect(translate('Custom node', 'zh')).toBe('Custom node')
})
