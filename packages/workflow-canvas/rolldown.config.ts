import { defineConfig } from 'rolldown'

const external = (id: string) =>
  id === '@joint/core' || id === '@lyx-pj/workflow-model' || id === 'lit-html' || id.startsWith('lit-html/')

// Keep @joint/core and model external to avoid duplicate JointJS / Node classes.
// Otherwise declarations and runtime instances differ, and canvas bundles grow unexpectedly.
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
