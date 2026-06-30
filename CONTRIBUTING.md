# Contributing to FileSnaps

Thank you for your interest in contributing! Please read this guide before opening an issue or pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [DOS and DON'TS](#dos-and-donts)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Security](#security)

## Code of Conduct

Be respectful, constructive, and inclusive. Harassment, trolling, and personal attacks will not be tolerated.

## Getting Started

1. Fork the repository.
2. Clone your fork: `git clone https://github.com/YOUR_USER/filesnaps.git`
3. Add the upstream remote: `git remote add upstream https://github.com/rodneydelacruz/filesnaps.git`
4. Create a branch (see [branching strategy](#branching-strategy)).
5. Make your changes.
6. Push and open a pull request.

## Development Setup

See [README.md](README.md#setup) for full setup instructions.

Quick start:

```bash
npm install
npm run install:all
cp worker/.dev.vars.example worker/.dev.vars
cp frontend/.env.example frontend/.env
npm run dev
```

Before submitting, verify:

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

## Branching Strategy

### Branch naming format

```
<type>/<short-description>
```

| Type | Purpose | Example |
|------|---------|---------|
| `feat/` | New feature | `feat/password-strength-indicator` |
| `fix/` | Bug fix | `fix/upload-progress-stuck-at-99` |
| `refactor/` | Code restructuring | `refactor/extract-crypto-utils` |
| `docs/` | Documentation only | `docs/api-auth-flow` |
| `chore/` | Tooling, deps, CI | `chore/update-wrangler-version` |
| `style/` | Formatting, styling | `style/consistent-import-order` |
| `perf/` | Performance improvement | `perf/lazy-load-syntax-themes` |
| `test/` | Adding or fixing tests | `test/upload-validation` |

### Rules

- Use kebab-case for the description (e.g. `fix/file-too-large-check`).
- Keep branch names short but descriptive.
- Never branch from a feature branch — always branch from `main`.
- Delete the branch after the PR is merged.

### Branch hierarchy

```
main
├── feat/upload-folder-support
├── fix/expiration-timer-off-by-one
├── docs/contributing-guide
└── chore/ci-add-wrangler-deploy
```

## Commit Guidelines

### Format

```
<type>: <imperative description>

[optional body]

[optional footer]
```

### Allowed types

Same as branch types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `test`.

### Examples

```
feat: add password strength indicator to upload form

fix: handle network error when turnstile token expires

docs: document ALLOWED_ORIGINS env var in README

chore: update wrangler to v4
```

### Rules

- Use the imperative mood ("add" not "added" or "adds").
- First line must be 72 characters or fewer.
- Reference issues with `#123` in the body or footer.
- Do not end the subject line with a period.
- Keep commits atomic — one logical change per commit.

## Pull Request Process

1. **Create a branch** from `main` following the naming convention.
2. **Make your changes** — keep them scoped to one concern.
3. **Run lint and build** before pushing:

   ```bash
   cd frontend && npm run lint && npm run build
   ```

4. **Write a clear PR title** using the same type prefix (e.g. `feat: add dark mode toggle`).
5. **Describe your changes** in the PR body:
   - What changed and why.
   - Screenshots or recordings for UI changes.
   - Any manual testing performed.
6. **Keep PRs small** — under 400 lines is ideal. Large changes should be broken into multiple PRs.
7. **Do not force-push** after the review has started. Add new commits instead.
8. **Ensure CI passes** — the `lint-and-build` check must be green.

## Code Review Guidelines

### For authors

- Respond to review comments within 3 business days.
- If you disagree with a suggestion, explain why.
- Request re-review after addressing feedback.
- Squash commits on merge (merge queue handles this).

### For reviewers

- Be specific: "Rename `x` to `y`" not "this could be better".
- Distinguish between blockers (must fix) and suggestions (nice to have).
- Review at most 400 lines per session for thoroughness.
- Approve only when you are satisfied the change is correct.

## DOS AND DON'TS

### DO

- Follow the existing code style (plain JSX, no TypeScript).
- Use the existing UI primitives in `frontend/src/components/ui/`.
- Keep components focused — one file, one concern.
- Use `cn()` from `@/lib/utils` for conditional class names.
- Test manually before submitting (there are no automated tests yet).
- Update `DOCUMENTATION.md` and `README.md` if your change affects the public API or setup.
- Use the same Tailwind CSS design tokens (e.g. `bg-surface-raised`, `text-text-muted`).
- Handle loading, empty, and error states for every new component.

### DON'T

- Do not add TypeScript — this project uses plain JavaScript.
- Do not introduce new UI libraries without discussion (open an issue first).
- Do not commit secrets, API keys, or `.dev.vars` / `.env` files.
- Do not commit `frontend/dist/` — it is gitignored.
- Do not rewrite components for the sake of rewriting.
- Do not use `dangerouslySetInnerHTML` on untrusted content.
- Do not leave `console.log`, `debugger`, or commented-out code.
- Do not change the encryption scheme (PBKDF2 + AES-256-GCM) without a security review.
- Do not submit a PR with lint errors.

## Reporting Issues

### Before opening

- Search existing issues (open and closed) to avoid duplicates.
- Check if the issue is already fixed in `main`.

### Bug reports

Use this format:

```
**Describe the bug**
Clear and concise description.

**To reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment**
- Browser: [e.g. Chrome 120]
- OS: [e.g. Windows 11]
```

### Feature requests

Use this format:

```
**Problem**
What problem does this solve?

**Proposed solution**
How would you implement it?

**Alternatives considered**
What else did you consider?
```

## Feature Requests

Feature requests are welcome. Before investing significant time, open an issue to discuss the approach. This avoids wasted effort if the feature is out of scope.

## Security

If you find a security vulnerability, **do not open a public issue**. Report it via a [private advisory](https://github.com/rodneydelacruz/filesnaps/security/advisories/new) on GitHub.
