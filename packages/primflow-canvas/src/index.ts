export type { CanvasLanguage } from './ui/i18n'

export {
  Graph,
  type GraphOptions,
  type GraphViewHandlers,
  type NodeInstanceType,
  type LinkInstanceType,
  type ReplayOptions
} from './Graph'

export { NodeToolsView, NodeToolView } from './NodeToolsView'

export { EditorRegistry } from './ui/editors'

export { NodeRendererRegistry } from './ui/nodeRenderers'

export type { NodeRendererContext, NodeRendererRegistration, PortLayoutContext } from './ui/nodeRenderers'

export type {
  EditorScope,
  EditorRegistration,
  PortEditorRegistration,
  PanelEditorRegistration,
  PortEditorContext,
  PanelEditorContext,
  PortOverlayHost,
  PortOverlayOptions,
  OverlayPlacement
} from './ui/editors'

// Reexport the template helpers so an application can build editor controls
// without depending on lit-html directly.
export { html, nothing, type TemplateResult } from 'lit-html'
export { ref } from 'lit-html/directives/ref.js'

export type {
  CanvasExecutionStatus,
  NodeExecutionData,
  PaletteOptions,
  PaletteItemDescription,
  PaletteEntry,
  ContextMenuOptions,
  ContextMenuItem,
  ContextMenuContext,
  NodePanelOptions,
  PanelRenderContext,
  PanelOverviewContext,
  PanelGlobalSettingsContext,
  PanelSection,
  PanelSectionContext,
  PanelSectionId,
  DebugPanelOptions,
  DebugPanelData,
  DebugRecord,
  DebugRecordStatus,
  DebugLogEntry,
  DebugLogLevel,
  DebugScope,
  ToolbarOptions,
  ToolbarAction,
  ToolbarContext
} from './ui/types'

// Reexport model's public API from the canvas entry point.
// Consumers can access graph editing through one package.
export {
  defineNode,
  NodeInstance,
  NodeRegistry,
  VariableManager,
  ChangedEvent,
  ChangedEventType,
  EventEmitter,
  mergeDeep
} from '@lyx-pj/primflow-model'

export type {
  NodeExecutionStatus,
  NodeClassType,
  NodeStyle,
  LinkStyle,
  JsonNode,
  JsonLink,
  JsonVariable,
  JsonGraph
} from '@lyx-pj/primflow-model'

export type { ThumbnailHandle, ThumbnailOptions } from './preview/renderThumbnail'
export type { SubgraphPreviewManager } from './preview/SubgraphPreviewManager'
export type { CachedSubgraphPreview, SubgraphPreviewCacheAdapter } from './preview/previewCache'
