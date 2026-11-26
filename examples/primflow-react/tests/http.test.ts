import './language'
import { afterEach, expect, test, vi } from 'vitest'
import { createEngine, link, node, stopEngines } from './helpers'

const url = 'https://example.test/resource'

afterEach(() => {
  stopEngines()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('HTTP 节点通过服务发出 GET，并把 JSON 和状态码交给后续节点', async () => {
  const payload = { message: 'hello' }
  const request = vi.fn(async () => Response.json(payload))
  vi.stubGlobal('fetch', request)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', { url }), node('Print', 'print')],
    [link('start', 'start', 'http'), link('http', 'done', 'print'), link('http', 'body', 'print', 'message')],
  )

  await instance.start()

  expect(request).toHaveBeenCalledWith(new URL(url), expect.objectContaining({
    method: 'GET', body: undefined, signal: expect.any(AbortSignal),
  }))
  expect(instance.getNodeExecutionData('http')?.outputs).toEqual({ status: 200, body: payload })
  expect(instance.getNodeExecutionData('print')?.outputs.result).toEqual(payload)
})

test('HTTP 节点发送 JSON 请求体，在非 2xx 响应时输出状态码和文本并走失败分支', async () => {
  const request = vi.fn(async () => new Response('Conflict', {
    status: 409, headers: { 'Content-Type': 'application/problem+json' },
  }))
  vi.stubGlobal('fetch', request)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const body = { name: 'demo' }
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', { url, method: 'POST', body }),
      node('Print', 'success'), node('Print', 'failure')],
    [link('start', 'start', 'http'), link('http', 'done', 'success'), link('http', 'error', 'failure')],
  )

  await instance.start()

  expect(request).toHaveBeenCalledWith(new URL(url), expect.objectContaining({
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  expect(instance.getNodeExecutionData('http')?.outputs).toEqual({ status: 409, body: 'Conflict' })
  expect(instance.getNodeStatus('success')).toBe('skipped')
  expect(instance.getNodeStatus('failure')).toBe('completed')
})

test.each([
  [{ url: '' }, '请输入 HTTP 请求地址'],
  [{ url, method: 'TRACE' }, '不支持的 HTTP 请求方法'],
])('拒绝发出配置无效的 HTTP 请求 %#', async (values, error) => {
  const request = vi.fn()
  vi.stubGlobal('fetch', request)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', values)],
    [link('start', 'start', 'http')],
  )

  await instance.start()

  expect(request).not.toHaveBeenCalled()
  expect(instance.getNodeStatus('http')).toBe('failed')
  expect(instance.getTasks()[0].errors[0].message).toContain(error)
})

test('请求地址协议非法时走错误分支并报告原因', async () => {
  const request = vi.fn()
  vi.stubGlobal('fetch', request)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', { url: 'data:text/plain,example' }),
      node('Print', 'success'), node('Print', 'failure')],
    [link('start', 'start', 'http'), link('http', 'done', 'success'), link('http', 'error', 'failure')],
  )

  await instance.start()

  expect(request).not.toHaveBeenCalled()
  expect(instance.getNodeStatus('http')).toBe('completed')
  expect(instance.getNodeStatus('success')).toBe('skipped')
  expect(instance.getNodeStatus('failure')).toBe('completed')
  expect(String(instance.getNodeExecutionData('http')?.outputs.body)).toContain('请求地址必须使用 HTTP 或 HTTPS')
})

test('HTTP 网络故障走错误分支并报告失败原因', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Network unavailable') }))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', { url }),
      node('Print', 'success'), node('Print', 'failure')],
    [link('start', 'start', 'http'), link('http', 'done', 'success'), link('http', 'error', 'failure')],
  )

  await instance.start()

  expect(instance.getNodeStatus('http')).toBe('completed')
  expect(instance.getNodeStatus('success')).toBe('skipped')
  expect(instance.getNodeStatus('failure')).toBe('completed')
  // The failure reason is published so the error branch can inspect it.
  expect(instance.getNodeExecutionData('http')?.outputs.status).toBe(0)
  expect(String(instance.getNodeExecutionData('http')?.outputs.body)).toContain('Network unavailable')
})

test('停止工作流会取消正在进行的 HTTP 请求', async () => {
  const request = vi.fn((_url: URL, { signal }: RequestInit) => new Promise<Response>((_, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
  }))
  vi.stubGlobal('fetch', request)
  const instance = createEngine(
    [node('start'), node('HttpRequest', 'http', { url })],
    [link('start', 'start', 'http')],
  )

  const running = instance.start()
  try {
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
    const taskId = instance.getTasks()[0].id
    instance.stop()
    await instance.whenStopped()
    expect(request.mock.calls[0][1].signal?.aborted).toBe(true)
    expect(instance.getTask(taskId)?.status).toBe('cancelled')
  } finally {
    await instance.stop().whenStopped()
    await running
  }
})
