# MIA Frontend

This is the frontend of MIA. It connects to the mia api backend.

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
