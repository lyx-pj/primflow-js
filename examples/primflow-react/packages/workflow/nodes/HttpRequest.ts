import { defineNode } from '@lyx-pj/primflow-model'
import { localize } from '../i18n'
import { headerStyle } from './theme'

export const httpMethods: readonly string[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']

export const HttpRequest = defineNode({
  executor: 'workflow.http-request',
  get definition() {
    return {
      name: localize('HTTP Request', 'HTTP 请求'),
      inputs: [
        { name: 'exec', type: 'exec' },
        {
          name: 'method',
          type: 'string',
          editor: 'select',
          label: localize('Method', '方法'),
          options: httpMethods.map((value) => ({ label: value, value })),
        },
        { name: 'url', type: 'string', label: localize('URL', '地址') },
        { name: 'body', type: 'object', label: localize('Body', '请求体') },
      ] as const,
      outputs: [
        { name: 'success', type: 'exec', label: localize('Success', '成功') },
        { name: 'error', type: 'exec', label: localize('Error', '错误') },
        { name: 'status', type: 'number', label: localize('Status', '状态码') },
        { name: 'body', type: 'any', label: localize('Body', '响应体') },
      ] as const,
      style: headerStyle('network'),
    } as const
  },
})
