# Release and Pages trigger specification

English | [简体中文](release-plan.zh-CN.md)

Revision: r2; status: confirmed. See the [release design](release-design.md).
Source: the user requests version branches, explicit release commits, and automatic Pages deployment only for release updates.

## Current behavior and goal

`scripts/release.ts` runs checks, Changesets versioning and builds, commits `chore: bump versions [skip ci]` on the current branch, publishes npm packages, and pushes. The Pages workflow listens to every `main` push and supports manual dispatch.

The goal is to deploy an identifiable release snapshot without deploying everyday development commits. Give all four libraries a unified version, with Changesets continuing to manage increments and internal dependencies. Add no dependencies and perform no real publication or push during implementation.

## Requirements and acceptance

| ID     | Requirement and acceptance                                                                                                                                                                                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REL-01 | A successful version release produces a `release/vX.Y.Z` branch and a `chore(release): vX.Y.Z` commit without `[skip ci]`, passing the existing commitlint configuration.                                                                                                                                                                                      |
| REL-02 | Ordinary `main` pushes do not automatically deploy Pages. Release updates on release branches deploy their snapshot. Retain manual dispatch.                                                                                                                                                                                                                   |
| REL-03 | Preserve clean-worktree validation, lint, tests, type checking, builds, and npm publishing. A prerequisite failure stops subsequent publishing and pushing.                                                                                                                                                                                                    |
| REL-04 | No version changes produce no empty release commit or duplicate deployment. Interrupted releases can be retried; recovery rules require design confirmation.                                                                                                                                                                                                   |
| REL-05 | Validate branch names, release identifiers, and branch collisions before external publication. Never overwrite an existing release branch.                                                                                                                                                                                                                     |
| REL-06 | Update English and Chinese usage documentation and test through mocked commands, without real commits, pushes, or npm publication.                                                                                                                                                                                                                             |
| REL-07 | Put all four libraries in a Changesets `fixed` group so they are versioned and published together. Calculate the unified version automatically from changesets, with no additional version argument or prompt. Derive branch and commit names from that version. Reject inconsistent versions rather than overwriting Changesets output with the root version. |

## Confirmed rules

1. Keep version updates on `main`, with the release branch pointing to the same commit, so subsequent Changesets start from current versions.
2. The user explicitly requires a unified version without additional version selection. Use a `fixed` group to version all four libraries together based on Changesets output. Synchronize the private root package to that result; exclude the private example package from npm release version management. This reverses the direction of the old `sync-versions.ts`; do not add that script to the release flow.
3. Use `chore(release): v0.0.7`, verified against repository commitlint, and `release/v0.0.7` as the branch name. Derive both automatically from the unified version. Keep `pnpm release` without extra arguments.
4. Retain manual Pages dispatch for deployment retries and restrict automatic deployment to release updates.

## Evaluation plan

The baseline is the current script, release tests, and Pages workflow. The earlier commitlint check passed. After specification confirmation, `pnpm test:release` passed all 11 existing tests. These tests describe the original behavior and do not yet validate the new design.

Implementation starts with a failing regression test, followed by `pnpm test:release`. Cover ordinary releases, a single-package changeset upgrading the entire group, no changes, version consistency validation, branch collisions, check failures, publication failures, push failures, and retries. Inspect Pages event filtering and checkout sources. Mocked verification does not validate a live deployment; confirm that during the first actual release. No full repository build is needed unless changes extend to package boundaries.

## Confirmation record

r2: the user explicitly required `@commitlint/config-conventional`, unified package versions, and no additional version selection, replacing r1's independent versions and explicit batch identifier options. The subsequent reply “确认” on 2026-11-17 confirmed specification r2 and the remaining proposed flow. Design confirmation is separate.
