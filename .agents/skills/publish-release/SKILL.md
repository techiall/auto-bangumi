---
name: publish-release
description: Publish a versioned Auto Bangumi GitHub release. Use when asked to prepare, tag, publish, or verify a release, including bilingual release notes and matching GHCR Docker image tags.
disable-model-invocation: true
---

# Publish Release

Publish a release from the current `origin/master` without changing deployment policy. Read `AGENTS.md`, `.github/workflows/docker-images.yml`, and the previous GitHub release before acting.

Release identity is root `package.json` version `X.Y.Z`, the matching root `package-lock.json` version entries, the annotated git tag `vX.Y.Z`, and the GitHub release. Bump and commit the root package files before tagging. Do not invent a version field in `agent/package.json`.

## Preflight

1. Verify `gh auth status`, the repository identity (`techiall/auto-bangumi`), and that `origin/master` is the intended target. Fetch first; do not trust a stale local `master`.
2. Require an explicit version if it cannot be unambiguously inferred from the user's request. Use `X.Y.Z` in package files and `vX.Y.Z` for the tag and GitHub release.
3. Inspect the previous release/tag, commits since it, open pull requests, and recent workflow runs. Do not include unrelated work or promise changes that are absent from the target commit.
4. This repository permits squash merges only. `Docker Images` builds on `master` pushes, `v*` tags, and `workflow_dispatch`; for a release, only the run for that tag counts.

## Version Bump And Verify

1. Start from a clean checkout of `origin/master` or a freshly fetched dedicated release branch. Keep unrelated working-tree changes untouched.
2. Set root `package.json` `"version"` to `X.Y.Z`. Update root `package-lock.json` the same way (`npm version X.Y.Z --no-git-tag-version` is fine) so both the top-level `"version"` and `packages[""].version` match. Do not change dependency versions during this bump.
3. Commit only those version files, for example `release: vX.Y.Z`, and push the commit to the release branch / `master` as required by the user.
4. Run the checks appropriate to the change. For normal source changes, run `npm run check`; run `docker compose config` and relevant image builds when Docker files, Compose, or release image behavior changed.
5. Stop and report failures. Do not tag or release an unverified commit.

## Tag And Publish

1. Confirm the tag does not already exist locally or on GitHub. Never move, delete, or force-push an existing release tag.
2. Create and push an annotated tag on the version-bump commit:
   ```bash
   git tag -a "vX.Y.Z" <commit> -m "vX.Y.Z"
   git push origin "vX.Y.Z"
   ```
3. Wait for the tag-triggered `Docker Images` run only:
   ```bash
   gh run list --workflow "Docker Images" --branch "vX.Y.Z" --limit 5
   gh run watch <run-id>
   ```
   Ignore concurrent `master` builds. All three matrix images must succeed before creating the GitHub release:
   - `ghcr.io/techiall/auto-bangumi-server:vX.Y.Z`
   - `ghcr.io/techiall/auto-bangumi-agent:vX.Y.Z`
   - `ghcr.io/techiall/auto-bangumi-qbittorrent:vX.Y.Z`
4. Preserve the Compose deployment default of `latest`. The workflow also publishes immutable tag and SHA image tags; do not add image-tag environment variables unless the user explicitly changes that policy.
5. Create the GitHub release only after the tag push and that tag's image build succeed:
   ```bash
   gh release create "vX.Y.Z" --title "vX.Y.Z" --notes-file <notes.md>
   ```
   If a release already exists for the tag, inspect it and update only with the user's approval.

## Release Notes

Write notes for users, not maintainers. Put English first and Chinese second. Use short sections such as `What's new` / `更新内容`, `Upgrade notes` / `升级说明`, and `Images` / `镜像` only when useful.

- Describe observable behavior, setup changes, fixes, and compatibility notes.
- Include exact image tags when images were published.
- Omit internal cleanup, workflow mechanics, raw commit lists, and unsupported claims.
- Keep the English and Chinese content equivalent in meaning.

## Report

Return the release URL, version-bump commit, tag, completed tag workflow URL or ID, image tags, checks run, and any remaining warnings. Confirm root `package.json` / `package-lock.json` are `X.Y.Z`. Do not silently leave a tag without a corresponding release or vice versa.
