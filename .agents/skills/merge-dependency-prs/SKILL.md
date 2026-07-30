---
name: merge-dependency-prs
description: Review, verify, and safely merge compatible Dependabot and Renovate dependency pull requests in Auto Bangumi. Use when asked to inspect, batch merge, or clean up open dependency PRs while leaving conflicted, failed, duplicate, or incompatible bot PRs for their bots to update.
disable-model-invocation: true
---

# Merge Dependency PRs

Safely batch compatible dependency updates without mutating the user's local worktree. Read `AGENTS.md` before acting and use `techiall/auto-bangumi` as the GitHub repository unless the user specifies another target.

Dependabot covers root npm, `agent/` npm, `/docker` images, and GitHub Actions. Renovate may open overlapping PRs. When both bots open an equivalent update for the same package/version, keep one candidate and skip the other; prefer the PR with a cleaner diff and live checks.

## Discover And Classify

1. List open PRs with author, changed files, head SHA, mergeability, merge state, draft state, and check results:
   ```bash
   gh pr list --repo techiall/auto-bangumi --state open --limit 100 \
     --json number,title,author,headRefOid,isDraft,mergeable,mergeStateStatus,statusCheckRollup,files
   ```
2. Consider only requested dependency PRs from Dependabot or Renovate. Leave feature PRs and human-authored PRs alone unless the user explicitly includes them.
3. Inspect each candidate diff and dependency metadata. Classify it as:
   - direct dependency update (manifest + lockfile, or Actions/Docker pin);
   - lockfile-only duplicate of another direct update;
   - duplicate bot PR for the same package/version (including Dependabot vs Renovate);
   - major update or peer-dependency-sensitive update;
   - conflict, failed check, or unstable update.
4. Prefer a direct dependency PR over an equivalent lockfile-only duplicate. Never merge both duplicates, and never merge both bots' PRs for the same update.
5. Default to skip unless the user explicitly includes them:
   - Node / runtime image major bumps (images stay on Node 26 unless explicitly changed);
   - Docker base-image majors under `docker/`;
   - TypeScript, `typescript-eslint`, ESLint, React, Vite majors;
   - uncertain peer-range or package-script breaks.
   - For non-major high-risk updates, check declared peer ranges and package scripts instead of relying on GitHub's `CLEAN` status alone.

## Verify The Candidate Set

1. Build a candidate list that excludes drafts, failures, conflicts, duplicates, and incompatible or uncertain major updates.
2. Clone `origin/master` into a fresh temporary directory. Do not reset, rebase, or alter the user's existing checkout.
3. Fetch each candidate PR head and merge the candidates in the intended order in that temporary clone. Resolve no conflicts manually; a conflict means leave that PR to its bot.
4. Install dependencies with `npm ci` at the repository root and in `agent/` when either lockfile changed.
5. Run `npm run check`. Also run `docker compose config` and relevant image builds when Dockerfiles, Compose, or base images changed.
6. Stop if verification fails. Report the failed package and command, then leave all unmerged candidates untouched unless the user asks for a repair.

## Merge

1. Re-read each candidate's live head SHA, merge state, draft state, and checks immediately before merging.
2. Merge only non-draft PRs that are `MERGEABLE`, `CLEAN`, and free of failed, timed-out, or cancelled checks.
3. Use squash merge only, with the live head SHA protected by `--match-head-commit`:
   ```bash
   gh pr merge <number> --repo techiall/auto-bangumi --squash --match-head-commit <head-sha>
   ```
4. Merge sequentially. After each merge, wait for GitHub to recalculate the remaining PR states, then re-check before proceeding. If mergeability stays `UNKNOWN` for more than 60 seconds, skip that PR.
5. If a PR becomes stale, conflicting, failing, or otherwise non-clean, skip it without closing, rebasing, editing, or force-pushing it. Let Dependabot or Renovate handle it.
6. Do not pass `--delete-branch`; repository branch-retention settings own that behavior.

## Report

List the merged PR numbers and package updates, checks run, and every skipped PR with its current reason. Mention newly triggered workflow runs, but do not wait for unrelated long-running image jobs unless requested.
