import { defineConfig } from 'rolldown'

// model is a zero-dependency domain layer; its bundle must contain no external imports.
export default defineConfig({
  input: { index: 'src/index.ts' },
  external: [],
  output: {
    format: 'esm',
    dir: 'build',
    entryFileNames: '[name].mjs',
    minify: false,
    minifyInternalExports: false
  }
})
