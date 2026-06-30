# Contributing to FileSnaps

Thanks for your interest in contributing! We welcome issues, pull requests, and suggestions.

## Getting Started

1. Fork the repository.
2. Run `npm install` and `npm run install:all` to install dependencies.
3. Make your changes in a feature branch.
4. Run `npm run build` to verify the frontend builds.
5. Run `cd frontend && npm run lint` to check for lint issues.
6. Open a pull request.

## Pull Request Guidelines

- Keep changes focused and atomic.
- Write clear commit messages.
- Update documentation if you add or change a feature.
- Ensure the frontend builds without errors.
- Test manually before submitting — there are no automated tests yet.

## Code Style

- The project uses ESLint with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- Run `cd frontend && npm run lint` before committing.
- Follow the existing patterns in the codebase (no TypeScript, plain JSX).

## Reporting Issues

Open an issue with a clear title and steps to reproduce.

## Security

If you find a security vulnerability, please open a private advisory on GitHub rather than a public issue.
