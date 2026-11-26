import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars, placeholder as cmPlaceholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { linter, lintGutter, lintKeymap } from '@codemirror/lint'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { DataTypeRegistry, type InputPort } from '@lyx-pj/primflow-model'

/**
 * Delay before a parsed value is written back to the node.
 *
 * Writing on every keystroke would push an undo entry per character and
 * re-render the panel while the user types.
 */
const COMMIT_DELAY = 400

/**
 * Syntax colors for JSON tokens.
 *
 * The colors follow the canvas panel palette so the editor matches the
 * surrounding UI. They are set inline rather than through a stylesheet
 * because CodeMirror scopes them to a generated class.
 */
const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#7ee2b8' },
  { tag: tags.string, color: '#bae6fd' },
  { tag: tags.number, color: '#ffd479' },
  { tag: tags.bool, color: '#ff9e64' },
  { tag: tags.null, color: '#c4a7e7' },
  { tag: tags.separator, color: '#8b949e' },
  { tag: tags.brace, color: '#8b949e' },
  { tag: tags.squareBracket, color: '#8b949e' }
])

/**
 * Schema-free JSON editing extensions.
 *
 * The editor shows plain JSON text, so no JSON Schema drives the rendering.
 * `jsonParseLinter` reports syntax errors in the gutter and inline.
 */
function jsonExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    lintGutter(),
    linter(jsonParseLinter()),
    json(),
    syntaxHighlighting(jsonHighlightStyle),
    EditorView.lineWrapping,
    closeBrackets(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...lintKeymap,
      indentWithTab
    ])
  ]
}

/**
 * JSON code editor bound to one node input.
 *
 * CodeMirror owns its own DOM, so the editor is created imperatively inside a
 * plain container and kept alive across panel re-renders. Canvas syncs the
 * text when the node value changes outside the editor, such as undo or
 * loading a saved graph.
 */
export class JsonCodeEditor {
  private readonly container: HTMLDivElement
  private readonly input: InputPort
  private readonly dataTypes: DataTypeRegistry
  private readonly error: HTMLDivElement
  private readonly onChange: (value: unknown) => void
  private view: EditorView | null = null
  private disposed = false
  /** Latest parsed value; `undefined` while the text is not valid JSON. */
  private value: unknown
  /** Text currently in the editor, used to detect external updates. */
  private text: string
  private commitTimer: ReturnType<typeof setTimeout> | null = null
  /** Guards the change handler while the text is written programmatically. */
  private applying = false

  constructor(input: InputPort, value: unknown, onChange: (value: unknown) => void, dataTypes = new DataTypeRegistry()) {
    this.dataTypes = dataTypes
    this.input = input
    this.value = value
    this.onChange = onChange
    this.text = formatValue(value, input.type === 'array')
    this.container = document.createElement('div')
    this.container.className = 'bpgraph-json-editor'
    this.container.dataset.field = input.name
    this.container.setAttribute('role', 'group')
    this.container.setAttribute('aria-label', input.label ?? input.name)
    this.error = document.createElement('div')
    this.error.setAttribute('role', 'status')
    this.container.append(this.error)
  }

  /** The element to insert into the panel. */
  get element() {
    return this.container
  }

  /**
   * Create the editor.
   *
   * The initial text is seeded into the document, and the parsed value is
   * read back so the node keeps a valid value even if the stored one was
   * malformed.
   */
  mount() {
    if (this.disposed || this.view) return
    this.view = new EditorView({
      state: EditorState.create({
        doc: this.text,
        extensions: [
          ...jsonExtensions(),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || this.applying) return
            this.text = update.state.doc.toString()
            this.scheduleCommit()
          }),
          cmPlaceholder(this.input.label ?? this.input.name)
        ]
      }),
      parent: this.container
    })
  }

  /**
   * Push a value into the editor.
   *
   * Called when the node value changes outside the editor, such as undo or
   * loading a saved graph.
   */
  sync(value: unknown) {
    if (this.disposed) return
    const text = formatValue(value, this.input.type === 'array')
    this.value = value
    if (text === this.text) return
    this.text = text
    if (!this.view) return
    this.applying = true
    try {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: text }
      })
    } finally {
      this.applying = false
    }
  }

  /** Write the current text to the node after the commit delay. */
  private scheduleCommit() {
    if (this.commitTimer) clearTimeout(this.commitTimer)
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null
      this.commit()
    }, COMMIT_DELAY)
  }

  /**
   * Parse the current text and write it back to the node.
   *
   * Invalid JSON keeps the previous value, so a half-typed document never
   * corrupts the node.
   */
  private commit() {
    if (this.disposed || !this.view) return
    const text = this.view.state.doc.toString()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      // Keep the last valid value while the text is incomplete.
      return
    }
    const issue = this.dataTypes.validateValue(this.input.type, parsed, this.input.name)
    this.error.textContent = issue ?? ''
    if (issue) return
    if (deepEqual(parsed, this.value)) return
    this.value = parsed
    this.onChange(parsed)
  }

  /** Remove the editor and release its DOM. */
  destroy() {
    this.disposed = true
    if (this.commitTimer) {
      clearTimeout(this.commitTimer)
      this.commitTimer = null
    }
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
    this.container.remove()
  }
}

/** Render a value as editor text, keeping the port shape when empty. */
function formatValue(value: unknown, isArray: boolean): string {
  if (value === undefined || value === null) return isArray ? '[]' : '{}'
  try {
    return JSON.stringify(value, null, 2) ?? ''
  } catch {
    return isArray ? '[]' : '{}'
  }
}

/** Structural comparison used to skip redundant updates. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (typeof a !== 'object') return false
  const aKeys = Object.keys(a as Record<string, unknown>)
  const bKeys = Object.keys(b as Record<string, unknown>)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  )
}
