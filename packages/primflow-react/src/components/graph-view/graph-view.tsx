import {
  Graph,
  type GraphViewHandlers,
  type LinkInstanceType,
  type NodeClassType,
  type NodeInstanceType,
} from '@lyx-pj/primflow-canvas'
import { useEffect, useRef } from 'react'

export type GraphViewProps<NodeDefs extends Record<string, NodeClassType>> = {
  graph: Graph<NodeDefs>
  width?: number | string
  height?: number | string
  className?: string
  children?: React.ReactNode
  onNodeClick?: (node: NodeInstanceType, event: MouseEvent) => void
  onNodeDoubleClick?: (node: NodeInstanceType, event: MouseEvent) => void
  onNodeSelection?: (nodes: NodeInstanceType[]) => void
  onBlankClick?: (event: MouseEvent) => void
  onBlankDoubleClick?: (event: MouseEvent) => void
  onLinkClick?: (link: LinkInstanceType, event: MouseEvent) => void
  onDragStart?: (node: NodeInstanceType) => void
  onDrag?: (node: NodeInstanceType) => void
  onDragEnd?: (node: NodeInstanceType) => void
  onStartConnecting?: () => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  options?: {
    background?: string
    gridSize?: number
    drawGrid?: {
      size?: number
      color?: string
      thickness?: number
    }
  }
}

function toNodes(selection: Array<NodeInstanceType | LinkInstanceType>): NodeInstanceType[] {
  // Graph selection mixes nodes and links; use the shared model class for detection.
  // External dependencies ensure a single class identity across packages.
  return selection.filter((item) => item instanceof Graph.NodeInstance) as NodeInstanceType[]
}

export function GraphView<NodeDefs extends Record<string, NodeClassType>>({
  width = '100%',
  height = '100%',
  graph,
  className,
  children,
  options,
  onNodeClick,
  onNodeDoubleClick,
  onNodeSelection,
  onBlankClick,
  onBlankDoubleClick,
  onLinkClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onStartConnecting,
  onKeyDown,
}: GraphViewProps<NodeDefs>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handlersRef = useRef<GraphViewHandlers>({})
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Refresh callbacks after each render; Graph reads them when events fire.
  // This avoids stale props without disabling exhaustive-deps.
  useEffect(() => {
    handlersRef.current = {
      'node:click': onNodeClick,
      'node:dblclick': onNodeDoubleClick,
      'selection:changed': (selection) => onNodeSelection?.(toNodes(selection)),
      'blank:click': onBlankClick,
      'blank:dblclick': onBlankDoubleClick,
      'link:click': onLinkClick,
      'node:dragstart': onDragStart,
      'node:dragmove': onDrag,
      'node:dragend': onDragEnd,
      'start:connecting': onStartConnecting ? () => onStartConnecting() : undefined,
    }
  })

  // Graph owns mounting and subscriptions; the adapter maps framework lifecycles.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    return graph.mount(container, () => handlersRef.current, optionsRef.current)
  }, [graph])

  return (
    <div style={{ position: 'relative', width, height }}>
      <div
        style={{ width: '100%', height: '100%' }}
        className={className}
        onKeyDown={onKeyDown}
        ref={containerRef}
      ></div>
      {children}
    </div>
  )
}
