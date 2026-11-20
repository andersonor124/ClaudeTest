# ClaudeTest

General-purpose repo for trying out projects with Claude Code.
Current project: Daily To-Do web page with Excel export.

## Project
- Stack: plain HTML/CSS/JavaScript (no build step). SheetJS 0.18.5 from cdnjs for Excel export.
- Layout: `index.html`, `styles.css`, `src/todo-logic.js` (pure logic, works in browser + Node),
  `src/app.js` (DOM, localStorage), `tests/` (Node built-in test runner).

## Commands
- Install: none
- Run: open `index.html` in a browser
- Test: `npm test` (Node 18+)
- Lint/format: none yet

## Communication
- Be precise and direct. Plain language: no unnecessary jargon or corporate phrasing.
- Brief explanations; point out anything unusual or risky.
- Before starting any complex task, ask clarifying questions instead of guessing.

## Before making changes
- Propose a short plan and wait for approval before:
  - edits spanning multiple files
  - deleting or renaming files
  - adding dependencies or new tools
- Small, single-file fixes can go ahead directly.

## File naming
- Lowercase, words separated by hyphens: `user-profile.py`, `setup-notes.md`
- Descriptive names; no spaces or special characters.
- Exceptions: files whose names are set by convention (`README.md`, `CLAUDE.md`,
  `LICENSE`, `package.json`, `Dockerfile`, etc.) and language rules that forbid
  hyphens (e.g. Python modules use underscores: `user_profile.py`).

## Tests
- Define test cases during planning, before writing any code. Every plan lists
  the cases (inputs, expected results, edge cases) and gets approval with them.
- Write the tests first, then the code that makes them pass.
- Every code change comes with new or updated tests.
- Run the test suite before committing; don't commit with failing tests.
- If something can't reasonably be tested, say so and explain why.

## Git workflow
- Remote: https://github.com/andersonor124/ClaudeTest (default branch `main`).
- Work on a branch per change: `feature/short-description`, `fix/short-description`.
- Commit messages: imperative, short summary line (≤72 chars), body if needed.
  e.g. `Add login form validation`
- Commit when a logical change is complete and tests pass; then push the branch.
- Merge to `main` only after the user confirms. Never force-push to `main`.

## README
- Keep README.md current: update it whenever setup steps, commands, or features change.
