- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-session-lifecycle-idle-warning-expiry-shield-logout-bcg-001.md`
  summary: Local deadline enforcement compares server-authored instants with the client clock and has no skew correction.
  evidence: The contract does not supply a server-time source. A client clock running behind the server keeps the cover off after server expiry, and one running ahead shields too early. Resolving this needs a BCG-001 transport decision.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-session-lifecycle-idle-warning-expiry-shield-logout-bcg-001.md`
  summary: The direct application type check (`npx tsc -p tsconfig.app.json --noEmit`) reports 16 pre-existing errors, some in files this story touched. The solution-level `npm run typecheck` hides them.
  evidence: The count dropped from the 19-error baseline and this story added none. The `typecheck` script should be fixed so these errors surface.
- source_spec: `_bmad-output/implementation-artifacts/spec-locale-on-demand-catalogs.md`
  summary: LANDED 2026-10-14. All seven catalogs load on demand; the active catalog is ready before first paint;
    switching is atomic with explicit failure/recovery, fenced across sign-in/scope transitions. Entry/static JS
    259,274 → 192,803 gzip; largest initial paint 216,884/260,000 (pt-BR).
  evidence: Full gate exit 0 (927 unit, 348 browser); independent review pass with a mutation-checked sign-in fence.
    See `tmp/agent-execution/locale-on-demand-catalogs/` (not committed).
- source_spec: `_bmad-output/implementation-artifacts/spec-locale-on-demand-catalogs.md`
  summary: Trivy LOW advisory — CVE-2026-103923 in katex 0.16.47 (fixed in 0.18.2). Nonblocking dependency advisory;
    evaluate a katex bump separately.
  evidence: Identified in the 2026-10-14 locale gate adjudication
    (`tmp/agent-execution/locale-on-demand-catalogs/verify-trivy-adjudication.md`). The gate's MEDIUM candidate is the
    known public country-code false positive (`src/platform/ui/countryCodes.ts`), same asset class as 6-5/6-6.
