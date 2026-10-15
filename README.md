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

Run the complete local quality gate before submitting changes:

```bash
./run-all-tests.sh
```

The gate runs type checking, lint and architecture fences, formatting, unit tests, a production build, the compressed
initial-route JavaScript budget, Chromium E2E, duplication detection, dependency scanning, Tailwind Plus catalog
validation, and Markdown linting. Trivy remains an explicit environment-dependent skip when it is not installed.

GitHub Actions (`.github/workflows/checks.yml`) runs the same stages as individual steps on every push to `main` and
on pull requests. E2E and secret hygiene run on macOS. Two checks run only locally and the workflow reports them as
skipped: the API type check, which needs the sibling backend checkout, and the Tailwind Plus catalog check, which needs
the licensed library. CI does not replace running the local gate.

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
