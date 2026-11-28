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

export {
  registerPrimitives,
  PfSurface,
  PfButton,
  PfTooltip,
  PfSwitch,
  PfBadge,
  PfDivider,
  PfField,
  type PfSurfaceVariant,
  type PfSurfacePadding,
  type PfButtonVariant,
  type PfButtonSize,
  type PfSwitchSize,
  type PfBadgeTone,
  type PfFieldSize,
} from './ui/primitives'

export type {
  CanvasUIMountFn,
  CanvasUIMountHandle,
  CanvasUIMounter,
  CanvasUIRenderer,
  CanvasUISlot,
} from './ui/slots'

export type {
  CanvasTheme,
  CanvasExecutionStatus,
  CanvasUISlots,
  BaseSlotContext,
  NodeExecutionData,
  NodeFloatingAction,
  NodeFloatingBarOptions,
  NodeFloatingBarSlotContext,
  NodeWidgetPlacement,
  NodeWidgetContext,
  NodeWidgetsOptions,
  NodeWidgetBarSlotContext,
  PaletteOptions,
  PaletteItemDescription,
  PaletteEntry,
  PaletteSlotItem,
  PaletteSlotContext,
  ContextMenuOptions,
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuSlotContext,
  NodePanelOptions,
  NodePanelSlotContext,
  PanelRenderContext,
  PanelOverviewContext,
  PanelGlobalSettingsContext,
  PanelSection,
  PanelSectionContext,
  PanelSectionId,
  DebugPanelOptions,
  DebugPanelData,
  DebugPanelSlotContext,
  DebugRecord,
  DebugRecordStatus,
  DebugLogEntry,
  DebugLogLevel,
  DebugScope,
  ToolbarOptions,
  ToolbarAction,
  ToolbarContext,
  ToolbarSlotAction,
  ToolbarSlotContext,
  ZoomControlsSlotContext,
  MinimapViewportRect,
  MinimapNodeSnapshot,
  MinimapLinkSnapshot,
  MinimapSlotContext,
  ReplayBannerSlotContext,
  PortTooltipSlotContext,
  NodeExecutionPreviewSlotContext,
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
