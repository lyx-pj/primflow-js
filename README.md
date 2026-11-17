# Workflow JS

English | [简体中文](README.zh-CN.md)

A visual programming toolkit built around nodes and connections. A single graph definition connects editing, execution, and debugging, making the toolkit suitable for embedded workflow editors, data processing tools, and AI workflow applications. The repository contains four libraries and a runnable React example.

Try the [live React example](https://lyx-pj.github.io/workflow-js/).

## Packages and capabilities

| Package                   | Purpose                                            | Documentation                                |
| ------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `@lyx-pj/workflow-model`  | Define workflow data structures                    | [README](packages/workflow-model/README.md)  |
| `@lyx-pj/workflow-engine` | Execute workflows                                  | [README](packages/workflow-engine/README.md) |
| `@lyx-pj/workflow-canvas` | Edit workflows visually with English or Chinese UI | [README](packages/workflow-canvas/README.md) |
| `@lyx-pj/workflow-react`  | Use workflows in React applications                | [README](packages/workflow-react/README.md)  |

## Quick start

Install Node.js and pnpm first.

```bash
pnpm install
pnpm dev
```

Open the URL printed in the terminal to try the example application.

## Architecture

See [Architecture](docs/architecture.md) for module responsibilities, terminology, data ownership, and the execution flow.

## Current limitations

- Files are stored in the browser's IndexedDB. Cloud synchronization and collaborative editing are not provided.
- Execution history stays in memory and does not persist across processes.
- Stopping cancels scheduling and requests node cleanup, but does not undo requests or external writes already made.
- Loops have one form: the loop body decides when to stop. Subgraph parameter ports must be configured in code.

## Common commands

| Command                             | Purpose                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dev`                          | Start the example using library source files                                               |
| `pnpm dev:dist`                     | Build the libraries, start the example using their build output, and watch library changes |
| `pnpm build`                        | Build all libraries and check package boundaries                                           |
| `pnpm build:all`                    | Build the entire workspace, including the example                                          |
| `pnpm typecheck`                    | Check TypeScript types throughout the repository                                           |
| `pnpm lint` / `pnpm test`           | Lint code / run tests                                                                      |
| `pnpm test:release`                 | Run release regression tests without publishing packages                                   |
| `pnpm release`                      | Validate, update versions, build, publish npm packages, and push Git                       |
| `pnpm format` / `pnpm format:check` | Format files / check formatting                                                            |
| `pnpm clean`                        | Remove build output                                                                        |

## Publishing

Commit or stash workspace changes first, and ensure the logged-in npm account has publishing permission and meets the two-factor authentication requirements. For a new version, run `pnpm exec changeset`, select the affected packages and version increments, describe the changes, and commit the generated changeset. Changesets manages package versions and internal dependencies.

```bash
pnpm release
```

The process checks the working tree, runs lint, tests, and type checking, applies changesets, and builds the libraries. After a successful build, it creates a commit only if files changed, then publishes npm packages and pushes Git. If there are no pending changesets, it continues with the existing package versions, allowing retries. The root `package.json` version does not determine library release versions.

Any failed step stops subsequent operations and returns a nonzero exit code. Generated version files, commits, and published packages are not rolled back automatically. Resolve the failure and handle any uncommitted files before retrying `pnpm release`. If the Git push fails, npm publishing may already have completed.

## License

MIT
