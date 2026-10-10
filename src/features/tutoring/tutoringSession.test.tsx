import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { catalogs, locales } from "../../platform/i18n/locales";
import { TutoringEntryNotice } from "./TutoringEntryNotice";

// FFR-613: the workspace notice is fixed product copy, informational and
// persistent, and must exist in every launch locale with no fallback.
it("Tutoring FFR-613 notice renders fixed localized copy in every launch locale", () => {
  const baseline = catalogs["en-US"]["tutoring.noticeBody"] ?? "";
  for (const locale of locales) {
    const catalog: Record<string, string> = catalogs[locale];
    const heading = catalog["tutoring.noticeHeading"] ?? "";
    const body = catalog["tutoring.noticeBody"] ?? "";
    expect(heading.length > 0).toBe(true);
    expect(body.length > 0).toBe(true);
    // Fixed product copy: localized in every launch locale, never a fallback.
    if (locale !== "en-US") expect(body !== baseline).toBe(true);
    const view = render(
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale={locale}>
          <TutoringEntryNotice />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 2 }).textContent === heading &&
        document.body.textContent?.includes(body) === true &&
        // Persistent: no dismiss control exists.
        screen.queryByRole("button") === null,
    ).toBe(true);
    view.unmount();
  }
});
