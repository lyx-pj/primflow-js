import { defineConfig } from 'rolldown'

// Keep model external to avoid giving consumers a duplicate Node class.
// Duplicate classes would break instanceof checks between engine and canvas.
export default defineConfig({
  input: { index: 'src/index.ts' },
  external: ['@lyx-pj/primflow-model'],
  output: {
    format: 'esm',
    dir: 'build',
    entryFileNames: '[name].mjs',
    minify: false,
    minifyInternalExports: false
  }
})
