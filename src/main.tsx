import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/app.css";
import { AnnouncementProvider } from "./platform/announcer/AnnouncementRegion";
import { applyDocumentLocale, type Locale } from "./platform/i18n/locales";
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
  capturePasswordResetLink,
  reloadOnLateResetFragment,
} from "./platform/session/passwordResetLink";

// The first application instruction: capture and strip a reset-link fragment
// before any render, router start, request, or diagnostic can observe it.
const passwordResetLink = capturePasswordResetLink(
  window.location,
  window.history,
);
// Lives as long as the document; it never reads or retains a fragment itself.
reloadOnLateResetFragment(window);

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("MIA could not find its application root.");
}

const initialLocale: Locale = resolveInitialLocale(navigator.languages);
const initialTextSize: TextSize = readTextSize();
applyDocumentLocale(initialLocale);
applyTextSize(initialTextSize);

createRoot(rootElement).render(
  <StrictMode>
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale={initialLocale}>
        <App
          initialTextSize={initialTextSize}
          passwordResetLink={passwordResetLink}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>
  </StrictMode>,
);
