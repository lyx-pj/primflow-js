import { translate, type CanvasLanguage } from './i18n'

/** Render text safely, including circular references and BigInt values. */
export function formatExecutionValue(value: unknown, language?: CanvasLanguage): string {
  if (typeof value === 'string') return value
  const ancestors: object[] = []
  try {
    return JSON.stringify(value, function (_key, item: unknown) {
      if (typeof item === 'bigint') return `${item}n`
      if (item && typeof item === 'object') {
        while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop()
        if (ancestors.includes(item)) return translate('[Circular reference]', language)
        ancestors.push(item)
      }
      return item
    }, 2) ?? String(value)
  } catch {
    return translate('[Unrepresentable value]', language)
  }
}
