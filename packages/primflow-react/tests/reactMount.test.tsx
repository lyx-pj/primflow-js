// @vitest-environment jsdom
import { act, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'
import { CanvasPortalHost } from '../src/components/react-mount/canvas-portal-host'
import {
  createReactMount,
  createReactPortalRegistry,
  createReactSlot,
  PortalRegistryContext,
  useReactMount,
} from '../src/components/react-mount/react-mount'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
})

test('createReactMount and createReactSlot mount, update, and destroy React elements in a DOM container', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const slot = createReactSlot<{ label: string }>(({ label }) => <span className="react-slot">{label}</span>)
  let handle: ReturnType<typeof slot.mount>
  act(() => {
    handle = slot.mount(container, { label: 'Initial' })
  })
  expect(container.querySelector('.react-slot')?.textContent).toBe('Initial')

  act(() => {
    handle?.update?.({ label: 'Updated' })
  })
  expect(container.querySelector('.react-slot')?.textContent).toBe('Updated')

  await act(async () => {
    handle?.destroy?.()
    await Promise.resolve()
  })
  expect(container.querySelector('.react-slot')).toBeNull()

  const mountFn = createReactMount<{ count: number }>(({ count }) => <b className="count">{count}</b>)
  let fnHandle: ReturnType<typeof mountFn>
  act(() => {
    fnHandle = mountFn(container, { count: 7 })
  })
  expect(container.querySelector('.count')?.textContent).toBe('7')
  await act(async () => {
    fnHandle?.destroy?.()
    await Promise.resolve()
  })
  expect(container.querySelector('.count')).toBeNull()
})

test('useReactMount renders through CanvasPortalHost portals and inherits outer React Context', () => {
  const ThemeContext = createContext('unset')
  const portals = createReactPortalRegistry()

  const targetContainer = document.createElement('div')
  document.body.appendChild(targetContainer)
  const hostRootEl = document.createElement('div')
  document.body.appendChild(hostRootEl)

  let mountHandle: { update?: (ctx: { value: string }) => void; destroy?: () => void } | void
  function Consumer() {
    const reactMount = useReactMount()
    return (
      <button
        type="button"
        className="trigger"
        onClick={() => {
          const mount = reactMount<{ value: string }>(({ value }) => {
            const theme = useContext(ThemeContext)
            return <div className="portal-out">{`${theme}:${value}`}</div>
          })
          mountHandle = mount(targetContainer, { value: 'hello' })
        }}
      >
        Mount
      </button>
    )
  }

  const root = createRoot(hostRootEl)
  act(() => {
    root.render(
      <ThemeContext.Provider value="midnight">
        <PortalRegistryContext.Provider value={portals}>
          <Consumer />
          <CanvasPortalHost registry={portals} />
        </PortalRegistryContext.Provider>
      </ThemeContext.Provider>
    )
  })

  act(() => {
    hostRootEl.querySelector<HTMLButtonElement>('.trigger')!.click()
  })
  expect(targetContainer.querySelector('.portal-out')?.textContent).toBe('midnight:hello')

  act(() => {
    mountHandle?.update?.({ value: 'world' })
  })
  expect(targetContainer.querySelector('.portal-out')?.textContent).toBe('midnight:world')

  act(() => {
    mountHandle?.destroy?.()
  })
  expect(targetContainer.querySelector('.portal-out')).toBeNull()

  act(() => {
    root.unmount()
  })
})
