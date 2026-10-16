# MIA Frontend

This is the frontend of MIA. It connects to the MIA API backend.

## Development

Use Node.js 22, 24, or 26 and npm 11 or newer.

```bash
npm ci
npm run dev
```

The application is a client-rendered SPA. Vite proxies development API traffic only when a later feature adds the
backend contract; the public scaffold intentionally makes no API requests.

## Checks

For a story, run complete non-browser checks plus an explicitly chosen affected browser selection:

```bash
./run-all-tests.sh --affected-e2e e2e/scaffold.spec.ts --grep 'all text modes reflow at actual 200%'
```

Name the affected spec files; the optional grep further selects tests within them. A zero-match selection fails.
The output records mode, selection, count and command. Shared changes need a broader selection. Run the complete
local gate separately when complete E2E is needed:

```bash
./run-all-tests.sh
```

The bare gate samples audited presentation matrices; `./run-all-tests.sh --full-matrix` runs all presentation cells
locally. Epic completion and GitHub pushes additionally require exact-commit macOS evidence from
`scripts/verify-macos-e2e.sh`; a run against a mutable worktree is not that evidence. Standalone Playwright defaults
to the complete matrix.

The gate runs type checking, lint and architecture fences, formatting, unit tests, a production build, the compressed
initial-route JavaScript budget, Chromium E2E, duplication detection, dependency scanning, Tailwind Plus catalog
validation, and Markdown linting. Trivy remains an explicit environment-dependent skip when it is not installed.

GitHub Actions (`.github/workflows/checks.yml`) runs the same stages as individual steps on every push to `main` and
on pull requests. E2E runs its complete matrix on macOS. Two checks run only locally and the workflow reports them as
skipped: the API type check, which needs the sibling backend checkout, and the Tailwind Plus catalog check, which needs
the licensed library. CI does not replace running the local gate.

## Private per-commit QA

After the affected-local gate, independent review and an authorized commit, private Ubuntu QA
may run in parallel with the next independent story. A queued push is **QA pending**, not a pass. Every result belongs
to one commit SHA. A failure or canceled run requires a repair and a new reviewed/verified commit. The runner uses
synthetic fixtures, bundled Chromium, full presentation matrices, and one Playwright worker. It runs lockfile install,
build and E2E. API types, licensed catalog, vulnerability scanners and other local gate checks are **not** implied by
an E2E success.

One-time setup on the private Ubuntu host (access as `git` to the existing `~/mia-frontend.git`): inspect the bare
repository's hooks first. If it already has a post-receive or update hook, chain it without overwriting. Install the checked
scripts as that account and enable execution; install Chromium and system libraries as authorized separately:

```bash
scp .localgit/post-receive .localgit/update .localgit/qa-worker.sh .localgit/qa-job.sh .localgit/qa-recover.sh git@odroid:mia-frontend.git/hooks/
ssh git@odroid 'chmod 755 ~/mia-frontend.git/hooks/{post-receive,update,qa-worker.sh,qa-job.sh,qa-recover.sh}'
# From an isolated checkout on Ubuntu, as git: npm ci && npx playwright install chromium
# For OS dependencies, as authorized root in that checkout: npx playwright install-deps chromium
```

The update hook rejects rewrites/deletes of SHA-named QA refs; post-receive schedules `at` jobs under `git`. A `flock`
worker drains a FIFO queue in
`~/.local/share/mia-qa`. Each job checks out the accepted SHA in its own workspace, runs the tracked
`.localgit/post-receive-run.sh` and retains its private receipt, status and log. Workspaces are removed after execution.
An `at` submission failure is visible even if Git accepted the push. Use `recover SHA` only for a status explicitly
marked `reason=dispatch-failed`; it requeues the same immutable receipt without rewriting the ref. Test failures need
a new verified commit. For an already queued SHA, retrieve its state instead of re-pushing. Set `MIA_QA_HOST` and
`MIA_QA_URL` only for an explicitly configured equivalent private host.
If a job reports `reason=cleanup-unconfirmed`, the worker retains its owned workspace and refuses later jobs. Inspect
owned processes and the private log before removing `~/.local/share/mia-qa/cleanup-unconfirmed`; never kill an unknown
listener or treat this as a pass.

```bash
scripts/remote-qa.sh enqueue "$(git rev-parse HEAD)"
scripts/remote-qa.sh status "$(git rev-parse HEAD)"
scripts/remote-qa.sh logs "$(git rev-parse HEAD)"
scripts/remote-qa.sh wait "$(git rev-parse HEAD)" 7200
# If status reports reason=dispatch-failed: scripts/remote-qa.sh recover SHA
```

To enforce the GitHub push rule in a normal clone, install `.localgit/pre-push` into `.git/hooks/pre-push` only when
no existing hook is present; otherwise chain the new check from the existing hook. The actual private QA remote is
exempt. Branch and tag pushes to GitHub require a successful untracked receipt for the exact outgoing commit:

```bash
cp .localgit/pre-push .git/hooks/pre-push && chmod 755 .git/hooks/pre-push
scripts/verify-macos-e2e.sh "$(git rev-parse HEAD)"
```

The verifier builds and runs the complete Chromium matrix in an isolated exact-commit macOS checkout. Receipts and
logs are kept outside the repository under `~/.local/share/mia-qa/macos`. Do not use Ubuntu QA, an older macOS result,
or a successful push as a substitute for this check. Product Owner Chrome/Edge and Safari/VoiceOver manual release
evidence, including actual Safari on macOS, remains required independently. Local checks remain usable if QA is down.

## Tailwind Plus

The UI is built from [Tailwind Plus](https://tailwindcss.com/plus) components. A paid
subscription is required. The component library is **not committed** — the licence permits
using the components in this project but not redistributing their source — so each developer
downloads it once.

### One-time setup

Store your Tailwind Plus login outside the repository:

```bash
mkdir -p ~/.config/tailwindplus && chmod 700 ~/.config/tailwindplus
printf '{"email": "you@example.com", "password": "your-password"}\n' \
    > ~/.config/tailwindplus/credentials.json
chmod 600 ~/.config/tailwindplus/credentials.json
```

Then download the library into `tailwindplus/` (~87 MB, about a minute):

```bash
./scripts/twp-download.sh
```

Requires Node.js on a current LTS line (22, 24 or 26). The downloader launches Playwright
Chromium once to log in and saves a session beside the credentials, so subsequent runs need
no browser. Re-run it when Tailwind Plus ships component updates; it rewrites the agent
catalog automatically.

### How agents use it

The `tailwind-plus` skill in `.agents/skills/tailwind-plus/` gives BMAD agents the component
catalog and the lookup workflow. It pins MIA's one relevant format — Tailwind **v4**,
**React**, **light** mode, matching `DESIGN.md` — so agents cannot pull in `dark:` variants
that release one excludes.

`tailwindplus/` is gitignored, which makes it invisible to agent Glob tools. `Grep` and
`Read` work on it normally; listing and name search go through `scripts/twp.sh`:

```bash
./scripts/twp.sh list "Application UI/Overlays/Modal Dialogs"   # components in a group
./scripts/twp.sh find modal alert                               # search names
./scripts/twp.sh path "Application UI/Overlays/Modal Dialogs/Simple alert"
```

### Scripts

| Script                    | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `scripts/twp-download.sh` | Download or refresh the component library                   |
| `scripts/twp.sh`          | List, search and resolve component paths                    |
| `scripts/twp-catalog.sh`  | Sync the skill's catalog with the library (`--check` in CI) |

### Runtime dependencies

Tailwind Plus React components import from `@headlessui/react` and `@heroicons/react`. Both
are separate npm packages and are not part of the download.

## Licence

MIA is source-available under the [PolyForm Noncommercial License 1.0.0](LICENCE), the same licence as the backend.
Noncommercial use is permitted; commercial use requires a separate agreement.

Parts of the user interface are derived from [Tailwind Plus](https://tailwindcss.com/plus) components and are used
under the Tailwind Plus licence as part of this application. That licence, not the PolyForm licence, governs those
derived components: they may not be extracted or redistributed separately from MIA, for example as a component
library, UI kit, or template.
