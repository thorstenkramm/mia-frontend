- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-session-lifecycle-idle-warning-expiry-shield-logout-bcg-001.md`
  summary: Local deadline enforcement compares server-authored instants with the client clock and has no skew correction.
  evidence: The contract does not supply a server-time source. A client clock running behind the server keeps the cover off after server expiry, and one running ahead shields too early. Resolving this needs a BCG-001 transport decision.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-session-lifecycle-idle-warning-expiry-shield-logout-bcg-001.md`
  summary: The direct application type check (`npx tsc -p tsconfig.app.json --noEmit`) reports 16 pre-existing errors, some in files this story touched. The solution-level `npm run typecheck` hides them.
  evidence: The count dropped from the 19-error baseline and this story added none. The `typecheck` script should be fixed so these errors surface.
