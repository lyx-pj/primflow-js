import { defineService } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'

type HttpRequestOptions = {
  method: string
  body?: Record<string, unknown>
  signal?: AbortSignal
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  const text = await response.text()
  if (text && (contentType === 'application/json' || contentType?.endsWith('+json'))) {
    try {
      return JSON.parse(text)
    } catch {
      // Keep the original body if the server labels invalid JSON as JSON.
      return text
    }
  }
  return text
}

export const httpService = defineService('http', {
  value: {
    async request(url: string, { method, body, signal }: HttpRequestOptions) {
      const target = new URL(url, globalThis.location?.href)
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        throw new Error(localize('The URL must use HTTP or HTTPS.', '请求地址必须使用 HTTP 或 HTTPS。'))
      }

      const payload = method === 'GET' || method === 'HEAD' || body === undefined ? undefined : JSON.stringify(body)
      const response = await fetch(target, {
        method, signal, body: payload,
        headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
      })
      return { status: response.status, ok: response.ok, body: await readResponseBody(response) }
    },
  },
})
