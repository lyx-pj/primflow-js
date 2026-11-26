# @lyx-pj/primflow-engine

## 2.0.1

### Patch Changes

- a92bd5d: Include the source repository and package directory in npm metadata so consumers can trace each package to its source and verify its build provenance.
- Updated dependencies [a92bd5d]
  - @lyx-pj/primflow-model@2.0.1

## 2.0.0

### Major Changes

- Construct `Engine` with a `NodeRegistry` in place of `Runtime`. Load a graph with `engine.loadGraph(json)` and start it with `engine.start()` in place of `engine.process()`. Register named executors and services with `defineExecutor` and `defineService`. The engine now supports per-task state, structured execution traces, retry policies, stream ports, and business interruptions.

### Patch Changes

- Updated dependencies
- Updated dependencies [5d248f2]
  - @lyx-pj/primflow-model@2.0.0

## 1.1.0

### Minor Changes

- Use version tags for releases and GitHub Pages deployments.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-model@1.1.0

## 1.0.0

### Major Changes

- Rename the published packages to `@lyx-pj/primflow-*`. Update package installation and imports to use the new names.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-model@1.0.0
