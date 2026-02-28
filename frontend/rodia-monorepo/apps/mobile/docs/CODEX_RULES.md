Work in: c:\lce\Freight\frontend\rodia-monorepo\apps\mobile
Use Windows PowerShell. No &&. Run one command per line.

Rules:
- Optimize for token efficiency and minimal edits.
- Do not modify generated files.
- Do not refactor unrelated flows or move files unless explicitly asked.
- No mock branching in pages/widgets/hooks. Mock/fallback only in API layer.
- Do not guess status strings or response fields. Reuse existing constants, policy maps, and schema types.
- UI text must be Korean. Code identifiers remain English.
- Before editing, show only:
  1) root cause
  2) minimal files to change
  3) minimal fix plan
- After editing, show only:
  1) changed files
  2) validation result
  3) manual test checklist
- Do not print full files unless explicitly requested.