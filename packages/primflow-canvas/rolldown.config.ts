import { defineConfig } from 'rolldown'

const external = (id: string) =>
  id === '@joint/core' ||
  id === '@lyx-pj/primflow-model' ||
  id === 'lit-html' ||
  id.startsWith('lit-html/') ||
  id.startsWith('@codemirror/') ||
  id.startsWith('@lezer/')

// Keep @joint/core and model external to avoid duplicate JointJS / Node classes.
// Otherwise declarations and runtime instances differ, and canvas bundles grow unexpectedly.
// CodeMirror stays external too: it is a runtime dependency whose packages must
// not be duplicated, otherwise the editor state and view classes would differ.
export default defineConfig({
  input: { index: 'src/index.ts' },
  external,
  output: {
    format: 'esm',
    dir: 'build',
    entryFileNames: '[name].mjs',
    minify: false,
    minifyInternalExports: false
  }
})
