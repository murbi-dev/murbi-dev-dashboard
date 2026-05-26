---
name: code-review
description: Review code changes with a bug-finding stance. Use when Codex is asked to review a diff, pull request, branch, commit, patch, or working tree for correctness issues, regressions, security risks, performance problems, missing tests, API/contract breaks, migration hazards, or release risk.
---

# Code Review

## Goal

Perform reviews as a senior engineer looking for defects that matter. Prioritize behavior, correctness, maintainability risk, security, data loss, concurrency, edge cases, and missing validation over style preferences.

## Workflow

1. Identify the review scope:
   - For a working tree review, inspect `git status --short` and relevant `git diff`.
   - For a commit or branch review, inspect the requested range and changed files.
   - For a PR review, inspect the PR diff, changed files, and available test results.
2. Read enough surrounding code to understand contracts, call sites, data flow, and existing patterns before judging a change.
3. Check high-risk areas first: authentication, authorization, secrets, external APIs, persistence, migrations, caching, async flows, error handling, money/time/date logic, and user-visible behavior.
4. Verify tests at the right level for the changed behavior. Treat missing tests as a finding when the risk is meaningful.
5. Avoid broad refactors or preference comments unless they hide a real defect.
6. Run available validation commands only when appropriate for the repo and review scope. Report commands that were not run.

## Finding Standards

Only report actionable issues. Each finding must include:

- Severity: `Critical`, `High`, `Medium`, or `Low`.
- File and line reference when available.
- The concrete failure mode.
- Why it matters in production or future maintenance.
- A concise remediation direction.

Use these severity guidelines:

- `Critical`: data loss, security exposure, production outage, broken deployment, or irreversible user impact.
- `High`: likely runtime breakage, broken core workflow, auth bypass, contract break, or serious regression.
- `Medium`: real edge-case bug, missing important test, reliability issue, or confusing behavior with plausible impact.
- `Low`: minor defect, misleading state, small maintainability risk, or incomplete validation with limited blast radius.

## Output Format

Lead with findings, ordered by severity. Do not start with a summary unless there are no findings.

Use this structure:

```markdown
**Findings**
- `High` [path/to/file.ts:42] Short title.
  Explain the concrete issue, impact, and fix direction.

**Open Questions**
- Note assumptions or missing context that could change the review.

**Validation**
- `npm test` passed.
- `npm run build` not run; reason.
```

If no issues are found, state that clearly and still mention residual risk or test gaps:

```markdown
No blocking findings.

**Validation**
- Reviewed the diff only; tests were not run.
```

## Review Discipline

- Be specific rather than comprehensive. A short list of real defects is better than many speculative comments.
- Do not praise changes as a substitute for review.
- Do not claim a command passed unless it was actually run and completed successfully.
- Do not request unrelated rewrites during a review.
- If the diff is too large, sample intelligently and say which areas were reviewed.
