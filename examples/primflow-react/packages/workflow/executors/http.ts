import { defineExecutor } from '@lyx-pj/primflow-engine'
import { localize } from '../i18n'
import { HttpRequest, httpMethods } from '../nodes/HttpRequest'
import { httpService } from '../services/http'

export const httpExecutor = defineExecutor(HttpRequest, async ({ getInput, setOutput, next, services, signal }) => {
  const url = getInput('url')
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error(localize('Enter an HTTP request URL.', '请输入 HTTP 请求地址。'))
  }

  const method = getInput('method') ?? 'GET'
  if (!httpMethods.includes(method)) {
    throw new Error(localize('Unsupported HTTP method.', '不支持的 HTTP 请求方法。'))
  }

  let response
  try {
    response = await services.require('http').request(url.trim(), { method, body: getInput('body'), signal })
  } catch (error: unknown) {
    // A request that never produced a response has no status code, so the error branch reports it instead.
    if (signal?.aborted) throw error
    setOutput('status', 0)
    setOutput('body', error instanceof Error ? error.message : String(error))
    return next(['error'])
  }
  setOutput('status', response.status)
  setOutput('body', response.body)
  return next([response.ok ? 'success' : 'error'])
}, { services: [httpService] })
