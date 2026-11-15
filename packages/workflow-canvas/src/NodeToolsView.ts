import { html, nothing, render, type TemplateResult } from 'lit-html'
import { createRef, ref } from 'lit-html/directives/ref.js'
import type { NodeInstanceType } from './Graph'
import type { Graph } from './Graph'
import { EventEmitter } from '@lyx-pj/workflow-model'
import { ensureUiStyles } from './ui/styles'

/**
 * Container for floating node tools.
 *
 * lit-html owns structure; `host` is only the mount point.
 * Subclasses supply content through {@link NodeToolView.template}, not createElement.
 */
export class NodeToolsView {
  node?: NodeInstanceType
  /** Rendered toolbar root; undefined before mounting. */
  element?: HTMLElement
  tools: NodeToolView[]
  private readonly host: HTMLElement
  private readonly toolsRef = createRef<HTMLDivElement>()

  constructor(tools: NodeToolView[]) {
    this.tools = tools
    this.host = document.createElement('div')
  }

  remove() {
    this.unmount()
    this.node = undefined
    this.tools.forEach((tool) => tool.remove())
  }

  /**
   * model's node.graph exposes only the minimal NodeHost contract.
   * Assert canvas capabilities (container and subscriptions) once at this boundary.
   */
  private get graph(): Graph | undefined {
    return this.node?.graph as unknown as Graph | undefined
  }

  configure(node: NodeInstanceType) {
    this.node = node
    // Assign the node before rendering templates that read it.
    this.tools.forEach((tool) => tool.configure(node, this))
    this.mount()
    this.updatePosition()
    this.graph?.off('node:dragmove', this.onDragMove)
    this.graph?.on('node:dragmove', this.onDragMove)
  }

  onDragMove = () => {
    this.updatePosition()
  }

  update() {
    if (this.isMounted()) this.renderTools()
    this.updatePosition()
  }

  isMounted() {
    return this.host.parentElement !== null
  }

  mount() {
    if (!this.node) return
    if (this.isMounted()) return
    const graph = this.graph
    if (!graph?.container) return
    ensureUiStyles()
    graph.container.appendChild(this.host)
    this.renderTools()
  }

  unmount() {
    if (!this.isMounted()) return
    render(nothing, this.host)
    this.host.remove()
    this.element = undefined
    this.graph?.off('node:dragmove', this.onDragMove)
  }

  updatePosition() {
    if (!this.node || !this.element) return
    const bbox = this.node.bbox
    if (!bbox) return
    this.element.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`
  }

  public show() {
    this.mount()
    this.tools.forEach((tool) => tool.show())
  }

  public hide() {
    this.unmount()
    this.tools.forEach((tool) => tool.hide())
  }

  private renderTools() {
    render(
      html`<div ${ref(this.toolsRef)} class="bpgraph-node-tools-view">
        ${this.tools.map((tool) => tool.render())}
      </div>`,
      this.host
    )
    this.element = this.toolsRef.value ?? undefined
  }
}

type NodeToolViewEventsPayload = {
  position: [number, number]
}

export abstract class NodeToolView extends EventEmitter<NodeToolViewEventsPayload> {
  node?: NodeInstanceType
  parentView?: NodeToolsView
  private readonly toolRef = createRef<HTMLElement>()

  /** Rendered tool root; undefined before mounting. */
  get element(): HTMLElement | undefined {
    return this.toolRef.value ?? undefined
  }

  /** Subclass override for toolbar content. */
  protected template(): TemplateResult | typeof nothing {
    return nothing
  }

  render(): TemplateResult {
    return html`<div ${ref(this.toolRef)} class="bpgraph-node-tool-view">${this.template()}</div>`
  }

  configure(node: NodeInstanceType, parent: NodeToolsView) {
    this.node = node
    this.parentView = parent
  }

  show() {}
  hide() {}
  remove() {}
}
