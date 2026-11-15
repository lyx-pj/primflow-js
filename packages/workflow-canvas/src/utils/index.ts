import { mergeDeep } from '@lyx-pj/workflow-model'
import {
  fromJSON,
  toJSON,
  serializeNodes,
  serializeLinks,
  deserializeNodes,
  deserializeLinks
} from './serializer'

export { mergeDeep }

/**
 * Canvas composition utilities; mergeDeep is shared with model's NodeRegistry.
 * Serialization is canvas-specific because it requires Graph instances.
 */
export const Util = {
  mergeDeep,
  toJSON,
  fromJSON,
  serializeLinks,
  serializeNodes,
  deserializeLinks,
  deserializeNodes
}
