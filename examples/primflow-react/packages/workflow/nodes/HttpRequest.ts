import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'

export const httpMethods: readonly string[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']

export const HttpRequest = defineNode({
  executor: 'workflow.http-request',
  definition: {
    get name() { return localize('HTTP Request', 'HTTP 请求') },
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'url', type: 'string', get label() { return localize('URL', '请求地址') } },
      {
        name: 'method', type: 'string', editor: 'select',
        get label() { return localize('Method', '请求方法') },
        options: httpMethods.map(value => ({ label: value, value })),
      },
      { name: 'body', type: 'object', get label() { return localize('JSON body', 'JSON 请求体') } },
    ],
    outputs: [
      { name: 'done', type: 'exec', get label() { return localize('Success', '成功') } },
      { name: 'error', type: 'exec', get label() { return localize('HTTP error', 'HTTP 错误') } },
      { name: 'status', type: 'number', get label() { return localize('Status code', '状态码') } },
      { name: 'body', type: 'any', get label() { return localize('Response body', '响应体') } },
    ],
    style: { header: { background: '#256369', color: '#fff' } },
  },
})
