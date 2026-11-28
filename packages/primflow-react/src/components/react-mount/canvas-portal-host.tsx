import { Fragment, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ReactPortalRegistry } from './react-mount'

/** Function component wrapper so callbacks passed to `reactMount` can safely use React hooks. */
export function ReactMountBridge<TCtx>({
  render,
  context,
}: {
  render: (context: TCtx) => ReactNode
  context: TCtx
}) {
  return <>{render(context)}</>
}

/** Renders all active portals owned by a `ReactPortalRegistry`. */
export function CanvasPortalHost({ registry }: { registry: ReactPortalRegistry }) {
  const entries = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
  return (
    <>
      {entries.map((entry) => (
        <Fragment key={entry.id}>{createPortal(entry.element, entry.container)}</Fragment>
      ))}
    </>
  )
}
