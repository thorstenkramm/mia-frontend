import { StrictMode, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/App";
import "./app/app.css";
import { AnnouncementProvider } from "./platform/announcer/AnnouncementRegion";
import { applyDocumentLocale, type Locale } from "./platform/i18n/locales";
import { catalogStore } from "./platform/i18n/catalogLoader";
import recoveryCopy from "virtual:mia-locale-recovery";
import { RouteRecoveryPanel } from "./platform/ui/RouteRecoveryPanel";
import {
  MiaIntlProvider,
  resolveInitialLocale,
} from "./platform/i18n/MiaIntlProvider";
import {
  applyTextSize,
  readTextSize,
  type TextSize,
} from "./platform/prefs/preferences";
import {
  captureInvitationLink,
  invitationPaths,
} from "./platform/session/invitationLink";
import { reloadOnLateFragment } from "./platform/session/linkFragment";
import {
  capturePasswordResetLink,
  passwordResetPath,
} from "./platform/session/passwordResetLink";
import { holdGuardedHistoryTraversals } from "./platform/ui/routeDeparture";

// The first application instructions: capture and strip a reset or invitation
// link fragment before any render, router start, request, or diagnostic can
// observe it.
const passwordResetLink = capturePasswordResetLink(
  window.location,
  window.history,
);
const invitationLink = captureInvitationLink(window.location, window.history);
// Lives as long as the document; it never reads or retains a fragment itself.
reloadOnLateFragment(window, [passwordResetPath, ...invitationPaths]);
// Before the router starts listening, so unsaved input can hold Back/Forward.
holdGuardedHistoryTraversals(window);

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("MIA could not find its application root.");
}
const mountElement: HTMLElement = rootElement;

const initialLocale: Locale = resolveInitialLocale(navigator.languages);
const initialTextSize: TextSize = readTextSize();
applyDocumentLocale(initialLocale);
applyTextSize(initialTextSize);

const rootOptions = {
  // The eager route boundary renders localized recovery. React's default
  // diagnostics include arbitrary exception text/props; never log those.
  onCaughtError: () => console.error("MIA route recovery was shown."),
  onRecoverableError: () => console.warn("MIA recovered a rendering failure."),
};

let root: Root | undefined;
function application(
  catalog: Awaited<ReturnType<typeof catalogStore.load>>,
): void {
  root ??= createRoot(mountElement, rootOptions);
  root.render(
    <StrictMode>
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale={initialLocale} initialCatalog={catalog}>
          <App
            initialTextSize={initialTextSize}
            passwordResetLink={passwordResetLink}
            invitationLink={invitationLink}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>
    </StrictMode>,
  );
}

function BootstrapRecovery() {
  const [retrying, setRetrying] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const copy = recoveryCopy[initialLocale];
  async function retry() {
    setRetrying(true);
    try {
      const catalog = await catalogStore.retry(initialLocale);
      application(catalog);
    } catch {
      // Keep the explicit recovery surface; no authenticated work has started.
      setRetrying(false);
    }
  }
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus({ preventScroll: true });
        }}
      >
        {copy["entry.skipLink"]}
      </a>
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-lg px-4 py-8"
      >
        {/* Tailwind Plus: Application UI > Feedback > Alerts > With actions,
            v4/react-light.jsx, 2026-09-13-083323; page-level h1 recovery. */}
        <RouteRecoveryPanel
          pageHeading
          heading={copy["route.unavailable"]}
          actions={
            <>
              <button
                type="button"
                disabled={retrying}
                className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 disabled:opacity-50"
                onClick={() => void retry()}
              >
                {copy["entry.invitation.preview.tryAgain"]}
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                onClick={() => window.location.reload()}
              >
                {copy["route.reload"]}
              </button>
            </>
          }
        >
          <p>{copy["route.loadFailed"]}</p>
        </RouteRecoveryPanel>
      </main>
    </>
  );
}

// Never mount a route or start session discovery until its one active catalog
// is present. The first React paint is always in the negotiated language.
void catalogStore.load(initialLocale).then(application, () => {
  document.title = "MIA";
  root ??= createRoot(mountElement, rootOptions);
  root.render(<BootstrapRecovery />);
});
