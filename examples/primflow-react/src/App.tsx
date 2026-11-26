import { useEffect } from 'react'
import { GraphView } from '@lyx-pj/primflow-react'
import {
  EngineProvider,
  GraphProvider,
  getLanguage,
  translate,
  useWorkflow,
  type AppLanguage,
  type SaveStatus,
} from '../packages/workflow'
import { ViewSwitcher } from './components/ViewSwitcher'
import { ApprovalPanel } from './components/ApprovalPanel'

function formatTime(timestamp: number, language: AppLanguage) {
  return new Date(timestamp).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })
}

/** Turn save status into a readable sentence so autosave results stay visible to the user. */
function saveStatusText(status: SaveStatus, language: AppLanguage) {
  if (status.state === 'pending') return translate(language, 'save.pending')
  if (status.state === 'saving') return translate(language, 'save.saving')
  if (status.state === 'saved') {
    return status.savedAt
      ? translate(language, 'save.savedAt', { time: formatTime(status.savedAt, language) })
      : translate(language, 'save.saved')
  }
  if (status.state === 'error') return translate(language, 'save.error', { message: status.message ?? '' })
  return ''
}

function SaveIndicator({ status, language }: { status: SaveStatus; language: AppLanguage }) {
  const text = saveStatusText(status, language)
  if (!text) return null
  return (
    <div
      role="status"
      className={status.state === 'error' ? 'workflow-status workflow-status--error' : 'workflow-status'}
    >
      {text}
    </div>
  )
}

function Workflow() {
  const {
    graph,
    booting,
    handleKeyDown,
    loadError,
    runError,
    saveStatus,
    views,
    currentViewId,
    switchView,
    openSubgraph,
    createView,
    createSubgraph,
    renameView,
    deleteView,
  } = useWorkflow()
  const language = getLanguage()

  // Built-in canvas UI and page copy share one language; changing the browser language reloads the page.
  useEffect(() => {
    graph.setOptions({ language })
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = translate(language, 'app.title')
  }, [graph, language])

  return (
    <>
      <GraphView
        graph={graph}
        onKeyDown={handleKeyDown}
        className="graph-view"
        onNodeDoubleClick={(node) => {
          if (node.type !== 'subgraph' || !node.subgraphId) return
          // Embedded subgraphs from old data are entered by double-clicking the canvas; standalone subgraph files switch to their file.
          if (graph.model.hasSubgraph(node.subgraphId)) return
          void openSubgraph(node.subgraphId)
        }}
      />
      <ViewSwitcher
        language={language}
        views={views}
        currentViewId={currentViewId}
        onSelect={switchView}
        onCreate={(name, target) => {
          if (target === 'subgraph') void createSubgraph(name)
          else void createView(name)
        }}
        onRename={renameView}
        onDelete={deleteView}
      />
      {loadError && (
        <div role="status" className="workflow-notice">
          {loadError}
        </div>
      )}
      {runError && (
        <div role="status" className="workflow-notice workflow-notice--error">
          {runError}
        </div>
      )}
      <SaveIndicator status={saveStatus} language={language} />
      <ApprovalPanel language={language} />
      {booting && (
        <div role="status" className="workflow-loading">
          {translate(language, 'app.loading')}
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <GraphProvider>
      <EngineProvider>
        <div className="h-screen w-screen select-none max-md:pt-12">
          <Workflow />
        </div>
      </EngineProvider>
    </GraphProvider>
  )
}

export default App
