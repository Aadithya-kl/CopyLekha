# Contributing to CopyLekha

Thank you for helping. Bug reports, ideas and pull requests are all welcome.

## Opening an issue

Use [GitHub Issues](https://github.com/hossain101199/CopyLekha/issues) and pick a template:

- **Bug report:** what you did, what you expected, what happened, and your browser and system.
- **Feature request:** the problem you want solved, and your idea for it.

Please search the open issues first, in case it has already been reported. Never paste personal details into an issue.

## Making a change

1. Fork the repository and create a branch from `main`, for example `fix/marker-case`.
2. Set up the app as described in the [README](README.md#run-it-locally). Every npm command runs inside `frontend/`.
3. Make the smallest change that solves the problem, with its tests.
4. Before you push, run:

   ```
   npm run check
   npm run typecheck
   npm test
   npm run test:e2e
   ```

5. Open a pull request against `main`. Say what changed and why, and link the issue. CI must pass before a merge.

For a bigger change, such as a new feature, a new dependency or a change to how data is stored, open an issue first so we can agree on it.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, in English, the summary in the imperative and under about 72 characters.

- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`, `build`, `perf`.
- Scopes (optional): `typing`, `compare`, `import`, `storage`, `sound`, `result`, `library`, `settings`, `ui`, `analytics`, `deps`.
- Example: `fix(import): accept markers in lower case`.

## Code style

The product's behaviour is specified in [docs/PRD.md](docs/PRD.md); a change in behaviour updates it too.

The main rules, in short:

- TypeScript with `strict: true`; no `any`. Prettier and ESLint run on save with the committed `.vscode` settings.
- Rules live in `frontend/src/lib/` as plain functions with tests. Hooks hold state; components render.
- Use the shadcn/ui components and the color roles in `globals.css`; no raw colors in components.
- Accessibility is part of "done": real buttons and links, labels on every field, keyboard support, and contrast of at least 4.5:1.
- Never log or send answer text, typed text or stored data.
- UI text is in English, in sentence case, in plain words.
