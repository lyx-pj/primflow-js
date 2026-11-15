import {
  Button,
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Field,
  Fieldset,
  Input,
  Label,
  Legend,
  Radio,
  RadioGroup,
} from '@headlessui/react'
import { useState, type FormEvent } from 'react'
import { getLanguage, translate, type AppLanguage, type CreateTarget } from '../../packages/workflow'

type ViewNameDialogProps = {
  /** Page language; falls back to the current browser language. */
  language?: AppLanguage
  title: string
  description: string
  submitLabel: string
  /** Prefill the current name when renaming; leave empty when creating. */
  initialName?: string
  /** Name input copy; switches automatically based on the create target. */
  nameLabel?: string
  /** When provided, shows the View / Subgraph choice for creation. */
  createTarget?: {
    value: CreateTarget
    onChange: (target: CreateTarget) => void
  }
  onClose: () => void
  onSubmit: (name: string) => void
}

const cancelButtonClass =
  'h-8 cursor-pointer rounded-md border border-white/16 px-3 text-xs text-canvas-fg hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-canvas-fg focus-visible:outline-offset-1'
const submitButtonClass =
  'h-8 cursor-pointer rounded-md bg-canvas-accent px-3 text-xs font-medium text-white hover:bg-canvas-accent/85 focus-visible:outline-2 focus-visible:outline-canvas-fg focus-visible:outline-offset-1 data-disabled:cursor-not-allowed data-disabled:opacity-50'
const targetOptionClass =
  'cursor-pointer rounded-md border px-2.5 py-2 text-center text-xs focus:outline-none'

/**
 * Dialog for entering a name, shared by new view, new subgraph, and rename.
 *
 * Headless UI Dialog owns the overlay, focus trap, Esc close, and outside click;
 * form semantics go through Field / Label / Input / Button; only name state and empty validation stay here.
 * When creating, `createTarget` selects the view or subgraph name copy.
 */
export function ViewNameDialog({
  language: requestedLanguage,
  title,
  description,
  submitLabel,
  initialName = '',
  nameLabel,
  createTarget,
  onClose,
  onSubmit,
}: ViewNameDialogProps) {
  const language = requestedLanguage ?? getLanguage()
  const [name, setName] = useState(initialName)
  const trimmedName = name.trim()
  const creatingSubgraph = createTarget?.value === 'subgraph'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedName) return
    onSubmit(trimmedName)
  }

  return (
    <Dialog open onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <DialogPanel className="relative w-full max-w-sm rounded-xl border border-white/12 bg-canvas-panel p-5 text-canvas-fg shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <form onSubmit={submit}>
          <DialogTitle className="text-sm font-medium text-white">{title}</DialogTitle>
          {createTarget && (
            <Fieldset className="mt-4">
              <Legend className="block text-xs text-canvas-muted">
                {translate(language, 'dialog.createMode')}
              </Legend>
              <RadioGroup
                value={createTarget.value}
                onChange={createTarget.onChange}
                className="mt-1.5 grid grid-cols-2 gap-2"
              >
                <Radio
                  value="view"
                  className={({ checked, focus }) =>
                    [
                      targetOptionClass,
                      checked
                        ? 'border-canvas-accent bg-canvas-accent/15 text-white'
                        : 'border-white/16 text-canvas-muted hover:bg-white/8',
                      focus ? 'outline-2 outline-canvas-fg outline-offset-1' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {translate(language, 'dialog.viewOption')}
                </Radio>
                <Radio
                  value="subgraph"
                  className={({ checked, focus }) =>
                    [
                      targetOptionClass,
                      checked
                        ? 'border-canvas-accent bg-canvas-accent/15 text-white'
                        : 'border-white/16 text-canvas-muted hover:bg-white/8',
                      focus ? 'outline-2 outline-canvas-fg outline-offset-1' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {translate(language, 'dialog.subgraphOption')}
                </Radio>
              </RadioGroup>
            </Fieldset>
          )}
          <Field className={createTarget ? 'mt-3' : 'mt-4'}>
            <Label className="block text-xs text-canvas-muted">
              {nameLabel ?? translate(language, creatingSubgraph ? 'dialog.subgraphName' : 'dialog.viewName')}
            </Label>
            <Input
              autoFocus
              className="mt-1.5 h-9 w-full rounded-md border border-white/16 bg-black/25 px-2.5 text-sm text-white placeholder:text-canvas-muted focus:border-canvas-accent focus:outline-none"
              placeholder={translate(
                language,
                creatingSubgraph ? 'dialog.subgraphPlaceholder' : 'dialog.viewPlaceholder',
              )}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Description className="mt-2 text-xs text-canvas-muted">{description}</Description>
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" className={cancelButtonClass} onClick={onClose}>
              {translate(language, 'dialog.cancel')}
            </Button>
            <Button type="submit" className={submitButtonClass} disabled={!trimmedName}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogPanel>
    </Dialog>
  )
}
