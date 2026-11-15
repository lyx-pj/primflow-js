import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// Two development modes:
//   pnpm dev       (mode=development) → run library source directly, no build, changes take effect immediately
//   pnpm dev:dist  (mode=dist)        → run real release output from packages/*/build to verify packaging
// Both use the same app entry; the only difference is whether the @lyx-pj/source export condition is enabled.
export default defineConfig(({ mode }) => {
  const useBuiltPackages = mode === 'dist'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // Default conditions (module/browser/development|production) are overridden by custom conditions,
      // so list them explicitly here.
      conditions: useBuiltPackages
        ? ['module', 'browser', 'development|production']
        : ['@lyx-pj/source', 'module', 'browser', 'development|production'],
    },
    optimizeDeps: {
      // These two packages are linked to the workspace and must not be pre-bundled:
      // in dev they point at source, and in dev:dist they point at watch-rebuilt build output.
      exclude: [
        '@lyx-pj/workflow-model',
        '@lyx-pj/workflow-engine',
        '@lyx-pj/workflow-canvas',
        '@lyx-pj/workflow-react',
      ],
    },
  }
})
