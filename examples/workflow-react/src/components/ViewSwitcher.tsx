import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { useEffect, useState } from 'react'
import {
  getLanguage,
  quoteName,
  translate,
  type AppLanguage,
  type CreateTarget,
  type ViewMeta,
} from '../../packages/workflow'
import { ViewNameDialog } from './ViewNameDialog'

type ViewSwitcherProps = {
  /** Page language; falls back to the current browser language. */
  language?: AppLanguage
  views: ViewMeta[]
  currentViewId: string
  onSelect: (id: string) => void
  onCreate: (name: string, target: CreateTarget) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

/** New files occupy one row in the list and use a sentinel value to distinguish them. */
const CREATE_VALUE = '__create__'

/** Keep control styles in constants and leave only semantic class names on elements. */
const triggerClass =
  'flex h-8 w-64 cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/16 bg-canvas-toolbar px-3 text-xs text-canvas-fg backdrop-blur-sm hover:bg-white/12 focus:outline-none'
const optionsClass =
  'z-50 mt-1 w-64 max-w-[calc(100vw_-_1.5rem)] overflow-auto rounded-lg border border-white/12 bg-canvas-panel p-1 text-xs text-canvas-fg shadow-[0_8px_24px_rgba(0,0,0,0.35)] focus:outline-none'
const optionClass =
  'flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-white focus:outline-none'
const iconButtonClass =
  'cursor-pointer rounded p-1 text-canvas-muted hover:bg-white/8 hover:text-canvas-danger focus:outline-none'
// Renaming is a normal action, so its hover state must not use the danger color.
const editButtonClass =
  'cursor-pointer rounded p-1 text-canvas-muted hover:bg-white/8 hover:text-canvas-fg focus:outline-none'
const rowActionsClass = 'flex shrink-0 items-center gap-0.5'
const sectionClass = 'my-1 border-t border-white/10'
const sectionLabelClass = 'px-2 pb-1 pt-1 text-[11px] text-canvas-muted'
const typeBadgeClass =
  'shrink-0 rounded border border-canvas-accent/40 bg-canvas-accent/10 px-1 text-[10px] leading-4 text-canvas-accent'

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3M13.5 6.5l4 4" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/**
 * Top-left file control.
 *
 * The dropdown lists all standalone files by type: ordinary views first, subgraph files after. Each row has rename and
 * delete icon buttons on the right, and the list ends with New…. Subgraphs are standalone records; double-click a subgraph node
 * or select it here to switch to it. The New dialog lets you choose an ordinary view or a subgraph.
 *
 * Creation and renaming both use a centered dialog instead of inserting an input into the toolbar; deletion asks for confirmation.
 */
export function ViewSwitcher({
  language: requestedLanguage,
  views,
  currentViewId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ViewSwitcherProps) {
  const language = requestedLanguage ?? getLanguage()
  const typeName = (type: ViewMeta['type']) =>
    translate(language, type === 'subgraph' ? 'file.subgraph' : 'file.view')
  // Use a lowercase type name inside English aria-labels; Chinese uses the type name directly.
  const ariaType = (type: ViewMeta['type']) =>
    language === 'zh' ? typeName(type) : typeName(type).toLowerCase()
  const [creating, setCreating] = useState(false)
  const [createTarget, setCreateTarget] = useState<CreateTarget>('view')
  // File id awaiting rename; empty when the rename dialog is closed.
  const [renamingId, setRenamingId] = useState<string | null>(null)
  // File id awaiting delete confirmation; empty when no row is armed.
  const [armedId, setArmedId] = useState<string | null>(null)
  const current = views.find((view) => view.id === currentViewId)
  const renaming = views.find((view) => view.id === renamingId)
  const normalFiles = views.filter((view) => view.type === 'view')
  const subgraphFiles = views.filter((view) => view.type === 'subgraph')

  // Drop unfinished delete confirmations and rename dialogs when switching files.
  useEffect(() => {
    setArmedId(null)
    setRenamingId(null)
  }, [currentViewId])

  const renderFile = (view: ViewMeta) => {
    const armed = armedId === view.id
    const isCurrent = view.id === currentViewId
    return (
      <ListboxOption
        key={view.id}
        value={view.id}
        className={({ focus, selected }) =>
          [optionClass, focus || selected ? 'bg-white/8' : ''].filter(Boolean).join(' ')
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {/* Use a checkmark for the selected state and keep all text white. */}
          <span className="flex w-3.5 shrink-0 justify-center">{isCurrent ? <CheckIcon /> : null}</span>
          <span className="truncate">{view.name}</span>
          {view.type === 'subgraph' && (
            <span className={typeBadgeClass}>{translate(language, 'file.subgraph')}</span>
          )}
        </span>
        {armed ? (
          <span className="flex items-center gap-1">
            <span className="text-canvas-danger">{translate(language, 'file.confirmDelete')}</span>
            <button
              type="button"
              className="cursor-pointer rounded p-1 text-canvas-danger hover:bg-white/8 focus:outline-none"
              aria-label={translate(language, 'file.confirmDeleteLabel', {
                type: ariaType(view.type),
                name: quoteName(view.name, language),
              })}
              onClick={(event) => {
                // The option itself is single-select; clicking delete must not switch files.
                event.stopPropagation()
                setArmedId(null)
                onDelete(view.id)
              }}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              className={iconButtonClass}
              aria-label={translate(language, 'file.cancelDeleteLabel', {
                type: ariaType(view.type),
                name: quoteName(view.name, language),
              })}
              onClick={(event) => {
                event.stopPropagation()
                setArmedId(null)
              }}
            >
              <CloseIcon />
            </button>
          </span>
        ) : (
          <span className={rowActionsClass}>
            <button
              type="button"
              className={editButtonClass}
              aria-label={translate(language, 'file.renameLabel', {
                type: ariaType(view.type),
                name: quoteName(view.name, language),
              })}
              onClick={(event) => {
                // The option itself is single-select; clicking an icon button must not switch files.
                event.stopPropagation()
                setArmedId(null)
                setRenamingId(view.id)
              }}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className={iconButtonClass}
              aria-label={translate(language, 'file.deleteLabel', {
                type: ariaType(view.type),
                name: quoteName(view.name, language),
              })}
              onClick={(event) => {
                event.stopPropagation()
                setArmedId(view.id)
              }}
            >
              <TrashIcon />
            </button>
          </span>
        )}
      </ListboxOption>
    )
  }

  return (
    <>
      <div className="fixed left-3 top-3 z-40">
        <Listbox
          value={currentViewId}
          onChange={(value: string) => {
            setArmedId(null)
            if (value === CREATE_VALUE) {
              setCreateTarget('view')
              setCreating(true)
              return
            }
            onSelect(value)
          }}
        >
          <ListboxButton
            className={triggerClass}
            onClick={() => setArmedId(null)}
            title={current?.name ?? translate(language, 'file.untitled')}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{current?.name ?? translate(language, 'file.untitled')}</span>
              {current?.type === 'subgraph' && (
                <span className={typeBadgeClass}>{translate(language, 'file.subgraph')}</span>
              )}
            </span>
            <ChevronDownIcon />
          </ListboxButton>
          <ListboxOptions anchor="bottom start" className={optionsClass}>
            {normalFiles.length > 0 && (
              <>
                <div role="presentation" className={sectionLabelClass}>
                  {translate(language, 'file.views')}
                </div>
                {normalFiles.map(renderFile)}
              </>
            )}
            {subgraphFiles.length > 0 && (
              <>
                {normalFiles.length > 0 && <div role="presentation" className={sectionClass} />}
                <div role="presentation" className={sectionLabelClass}>
                  {translate(language, 'file.subgraphs')}
                </div>
                {subgraphFiles.map(renderFile)}
              </>
            )}
            <div role="presentation" className={sectionClass} />
            <ListboxOption
              value={CREATE_VALUE}
              className={({ focus }) => `${optionClass} ${focus ? 'bg-white/8' : ''}`}
            >
              <PlusIcon />
              <span>{translate(language, 'file.new')}</span>
            </ListboxOption>
          </ListboxOptions>
        </Listbox>
      </div>
      {creating && (
        <ViewNameDialog
          language={language}
          title={translate(language, createTarget === 'subgraph' ? 'dialog.newSubgraph' : 'dialog.newView')}
          description={translate(
            language,
            createTarget === 'subgraph' ? 'dialog.createSubgraphDescription' : 'dialog.createViewDescription',
          )}
          submitLabel={translate(language, 'dialog.create')}
          createTarget={{ value: createTarget, onChange: setCreateTarget }}
          onClose={() => setCreating(false)}
          onSubmit={(name) => {
            setCreating(false)
            onCreate(name, createTarget)
          }}
        />
      )}
      {renaming && (
        <ViewNameDialog
          language={language}
          title={translate(language, renaming.type === 'subgraph' ? 'dialog.renameSubgraph' : 'dialog.renameView')}
          description={translate(language, 'dialog.renameDescription')}
          submitLabel={translate(language, 'dialog.save')}
          initialName={renaming.name}
          nameLabel={translate(language, renaming.type === 'subgraph' ? 'dialog.subgraphName' : 'dialog.viewName')}
          onClose={() => setRenamingId(null)}
          onSubmit={(name) => {
            setRenamingId(null)
            onRename(renaming.id, name)
          }}
        />
      )}
    </>
  )
}
