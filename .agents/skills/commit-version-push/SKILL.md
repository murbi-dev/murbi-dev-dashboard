---
name: commit-version-push
description: Use when the user asks to commit and push changes in the Murbi Dev Dashboard, finalize work, publish changes, or "fazer commit". Reviews the diff, applies the required package version bump, validates the dashboard, stages only intended files, writes a Conventional Commit, commits, and pushes.
---

# Commit Version Push

Use this skill when the user wants changes committed and pushed in the Murbi Dev Dashboard.

The repository rules in `AGENTS.md` are authoritative. Read them before committing.

## Workflow

1. Inspect repository state.
   - Run `git status --short`.
   - Review changed files with `git diff` and, when needed, `git diff --staged`.
   - Do not include unrelated user changes unless the user asked to commit everything.

2. Classify the version bump.
   - `patch`: fixes, small adjustments, docs, internal improvements.
   - `minor`: new feature or relevant compatible dashboard behavior.
   - `major`: incompatible API/payload change, authentication contract break, Jira flow break, or major release shift.

3. Bump version for every commit.
   - Update `version` in `package.json` before committing.
   - Keep `package-lock.json` coherent with `package.json`.

4. Respect project docs.
   - Read `AGENTS.md`.
   - If the change affects architecture, authentication, API, security, Jira integration, status mapping, scripts, envs, frontend behavior, metrics, validation, or workflow rules, update `AGENTS.md` and the relevant file under `docs/` before committing.
   - Keep visible UI text in pt-BR and code/types/functions/internal values in English.

5. Validate.
   - Run all required commands before committing:
     - `npm run typecheck`
     - `npm run lint`
     - `npm run test`
     - `npm run build`
   - If validation cannot run, explain why before committing.

6. Stage only intended files.
   - Use `git add` with explicit paths.
   - Avoid staging `.env`, secrets, generated logs, `node_modules`, `.next`, `dist`, coverage output, or unrelated files.
   - Include `package-lock.json` when `package.json` version changed.

7. Create a Conventional Commit.
   - Format: `<type>(optional-scope): <short summary>`
   - Common types:
     - `feat`: new feature or meaningful new behavior.
     - `fix`: bug fix.
     - `docs`: documentation only.
     - `chore`: maintenance, config, dependencies, or version housekeeping.
     - `refactor`: behavior-preserving code change.
     - `test`: tests.
   - Prefer concise English commit messages, matching the codebase convention.

8. Push.
   - Run `git push` after a successful commit.
   - If push fails because the branch has no upstream, set upstream only when the branch name and remote are clear.

## Murbi Dev Dashboard Checks

Before committing, confirm changed behavior still preserves these project constraints when relevant:

- Jira access stays server-side.
- `/api/dashboard` remains the frontend contract.
- Board data excludes backlog, epics, and subtasks.
- Pagination is preserved for Jira board fetches.
- HOTFIX pinning and current-status age calculation are preserved.
- Services remain classes in `*.service.ts`.
- External clients stay in `src/clients`.
- Route-specific components stay under `src/app/**/components`; generic components stay under `src/components`.
- Tests and fixtures stay in `__tests__` near the tested scope.

## Safety

- Never commit `.env` or secrets.
- Never rewrite history unless explicitly requested.
- Never run destructive git commands like `git reset --hard` or `git checkout --` to prepare a commit.
- If unrelated changes are present, leave them unstaged or ask the user how to handle them.

## Final Response

Report:

- version bump applied;
- commit hash and message;
- push result;
- validation run and result;
- any files intentionally left uncommitted.
