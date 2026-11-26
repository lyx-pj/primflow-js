# @lyx-pj/primflow-react

## 2.0.1

### Patch Changes

- a92bd5d: Include the source repository and package directory in npm metadata so consumers can trace each package to its source and verify its build provenance.
- Updated dependencies [a92bd5d]
  - @lyx-pj/primflow-engine@2.0.1
  - @lyx-pj/primflow-canvas@2.0.1

## 2.0.0

### Major Changes

- Pass an engine factory to `createEngineContext`, for example `createEngineContext(() => new Engine(registry))`. Move engine options and executor or service registration into the factory in place of passing a `Runtime` and options to `createEngineContext`. The graph provider also accepts application editor and node renderer registrations before the canvas mounts.

### Patch Changes

- Updated dependencies [083628d]
- Updated dependencies
- Updated dependencies [466bd65]
- Updated dependencies [083628d]
- Updated dependencies [083628d]
- Updated dependencies
- Updated dependencies [5d248f2]
  - @lyx-pj/primflow-canvas@2.0.0
  - @lyx-pj/primflow-engine@2.0.0

## 1.1.0

### Minor Changes

- Use version tags for releases and GitHub Pages deployments.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-canvas@1.1.0
  - @lyx-pj/primflow-engine@1.1.0

## 1.0.0

### Major Changes

- Rename the published packages to `@lyx-pj/primflow-*`. Update package installation and imports to use the new names.

### Patch Changes

- Updated dependencies
  - @lyx-pj/primflow-engine@1.0.0
  - @lyx-pj/primflow-canvas@1.0.0
