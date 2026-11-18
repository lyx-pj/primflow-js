import './language'
import { expect, test } from 'vitest'
import { detectLanguage, getLanguage, localize, setLanguage, translate } from '../packages/workflow/i18n'

test('按浏览器语言偏好选择首个支持的语言，中文标签都归为中文', () => {
  expect(detectLanguage(['zh-CN', 'en-US'])).toBe('zh')
  expect(detectLanguage(['zh-TW'])).toBe('zh')
  expect(detectLanguage(['en-US', 'zh-CN'])).toBe('en')
  expect(detectLanguage(['fr-FR', 'zh-CN'])).toBe('zh')
  expect(detectLanguage(['fr-FR'])).toBe('en')
  expect(detectLanguage([])).toBe('en')
})

test('同一个消息按语言输出，并支持占位符替换', () => {
  expect(translate('zh', 'save.pending')).toBe('待保存…')
  expect(translate('en', 'save.pending')).toBe('Pending…')
  expect(translate('zh', 'default.viewName', { index: 2 })).toBe('视图 2')
  expect(translate('en', 'default.viewName', { index: 2 })).toBe('View 2')
  expect(translate('en', 'error.missingSubgraph', { node: '"Call"', id: 'sub-1' })).toBe(
    'Node "Call" references a missing subgraph file: sub-1',
  )
})

test('localize uses English as the source text', () => {
  expect(localize('English', '中文')).toBe('中文')
  setLanguage('en')
  expect(localize('English', '中文')).toBe('English')
})

test('默认读取 navigator.language，而不是固定中文', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'language')
  try {
    setLanguage(null)
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'zh-CN' })
    expect(getLanguage()).toBe('zh')
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' })
    expect(getLanguage()).toBe('en')
  } finally {
    if (original) Object.defineProperty(navigator, 'language', original)
    else Reflect.deleteProperty(navigator, 'language')
    setLanguage('zh')
  }
})
