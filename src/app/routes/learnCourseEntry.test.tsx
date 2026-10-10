import {
  act,
  configure,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { server } from "../../../test/server";
import {
  learnCapabilities,
  learnCourseDocument,
  learnMaterialRow,
} from "../../../test/learnFixtures";
import { authenticatedSessionResponse } from "../../../test/mfaFixtures";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { App } from "../App";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";

const originalError = getConfig().getElementError;
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Learn assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
const path = "/learn/courses/course_1";
const json = (body: unknown, status = 200) =>
  new HttpResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Cache-Control": "no-store",
    },
  });
function backend() {
  const seed = courseUnitFixture();
  const control = {
    ids: ["course_1"],
    available: true,
    active: true,
    accepting: false,
    deny: 0,
    fail: false,
    materialDeny: false,
    courseReads: 0,
    materialReads: 0,
    capabilityReads: 0,
    offsets: [] as number[],
    ledger: [] as string[],
    holdCapabilities: null as Promise<void> | null,
    holdCourse: null as Promise<void> | null,
  };
  server.use(
    http.get("/api/v1/auth/session", () => {
      control.ledger.push("session");
      return authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", async () => {
      control.capabilityReads++;
      control.ledger.push("capabilities");
      if (control.holdCapabilities) await control.holdCapabilities;
      return json(learnCapabilities(control.ids, control.available));
    }),
    http.get("/api/v1/courses/:id", async ({ params }) => {
      control.courseReads++;
      control.ledger.push("course");
      if (control.holdCourse) await control.holdCourse;
      if (control.deny || control.fail)
        return json(
          { errors: [{ code: "course_not_found", detail: seed.rawError }] },
          control.deny || 503,
        );
      return json(
        learnCourseDocument(
          seed.name,
          seed.teachingText,
          String(params.id),
          control.active ? "active" : "inactive",
          control.accepting,
        ),
      );
    }),
    http.get("/api/v1/courses/course_1/materials", ({ request }) => {
      control.materialReads++;
      control.ledger.push("materials");
      if (control.materialDeny)
        return json(
          { errors: [{ code: "material_not_found", detail: seed.rawError }] },
          404,
        );
      const offset = Number(
        new URL(request.url).searchParams.get("page[offset]"),
      );
      control.offsets.push(offset);
      return json({
        data:
          offset === 0
            ? [
                learnMaterialRow(seed.name, seed.teachingText),
                learnMaterialRow(
                  seed.rawError,
                  seed.teachingText,
                  "private",
                  "course_1",
                  "student-private",
                ),
              ]
            : [],
        meta: { has_more: offset === 0 },
        links:
          offset === 0
            ? {
                next: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=25",
              }
            : {
                prev: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=0",
              },
      });
    }),
  );
  return { control, seed };
}
function mount(location = path) {
  window.history.replaceState(null, "", location);
  return render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <App
          initialTextSize="standard"
          invitationLink={new InvitationLink(null)}
          passwordResetLink={new PasswordResetLink(null)}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}
async function ready(name = "Course") {
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { level: 1 }).textContent === name &&
        document.title ===
          `${name === "Joined courses" ? "Courses" : name} | MIA`,
    ).toBe(true),
  );
  await waitFor(() =>
    expect(
      document.activeElement === screen.getByRole("heading", { level: 1 }),
    ).toBe(true),
  );
}

it("Learn ordered admission withholds resource and metadata until capability and course settle", async () => {
  const { control, seed } = backend();
  let releaseCapabilities = () => {},
    releaseCourse = () => {};
  control.holdCapabilities = new Promise<void>((resolve) => {
    releaseCapabilities = resolve;
  });
  control.holdCourse = new Promise<void>((resolve) => {
    releaseCourse = resolve;
  });
  mount();
  try {
    await waitFor(() => expect(control.capabilityReads).toBe(1));
    expect(
      control.courseReads === 0 &&
        control.materialReads === 0 &&
        document.title === "MIA" &&
        !document.body.textContent?.includes(seed.name),
    ).toBe(true);
    await act(async () => releaseCapabilities());
    await waitFor(() => expect(control.courseReads).toBe(1));
    expect(
      control.materialReads === 0 &&
        document.title === "MIA" &&
        !document.body.textContent?.includes(seed.name),
    ).toBe(true);
    await act(async () => releaseCourse());
    await ready();
    await waitFor(() =>
      expect(document.body.textContent?.includes(seed.name)).toBe(true),
    );
    expect(
      control.ledger.join() === "session,capabilities,course,materials" &&
        document.body.textContent?.includes(seed.name) &&
        !document.body.textContent?.includes(seed.teachingText) &&
        !document.body.textContent?.includes(seed.rawError) &&
        screen.queryByRole("button", { name: /Start/u }) === null,
    ).toBe(true);
    courseUnitCheckpoint("learn-admitted");
  } finally {
    releaseCapabilities();
    releaseCourse();
  }
});

it("Learn joined discovery never unions staff scope and empty success is not a failed read", async () => {
  const { control, seed } = backend();
  const view = mount("/learn/courses");
  await ready("Joined courses");
  await waitFor(() =>
    expect(document.body.textContent?.includes(seed.name)).toBe(true),
  );
  expect(
    control.courseReads === 1 &&
      control.materialReads === 0 &&
      document.body.textContent?.includes(seed.name),
  ).toBe(true);
  view.unmount();
  control.ids = [];
  mount("/learn/courses");
  await ready("Joined courses");
  expect(
    control.courseReads === 1 &&
      screen.queryByText("No joined active courses were found.") !== null &&
      !document.body.textContent?.includes(seed.name),
  ).toBe(true);
  courseUnitCheckpoint("learn-list");
});

it("Learn revoked scope and inactive or hidden courses use one neutral primary presentation", async () => {
  const { control, seed } = backend();
  let primary: string | null = null;
  for (const cause of [
    "capability",
    "scope",
    "inactive",
    "404",
    "403",
    "429",
  ]) {
    control.available = cause !== "capability";
    control.ids = cause === "scope" ? [] : ["course_1"];
    control.active = cause !== "inactive";
    control.deny = ["404", "403", "429"].includes(cause) ? Number(cause) : 0;
    const view = mount();
    await ready("Course access unavailable");
    const surface = {
      heading: screen.getByRole("heading", { level: 1 }).textContent,
      copy: screen.getByText(
        "This course view is unavailable. Use an available exit.",
      ).textContent,
      buttons: screen
        .queryAllByRole("button")
        .filter((node) => node.textContent !== "Technical details")
        .map((node) => node.textContent),
      links: Array.from(document.querySelectorAll("main a")).map((node) =>
        node.getAttribute("href"),
      ),
      title: document.title,
      path: window.location.pathname,
      focus: document.activeElement?.tagName,
    };
    if (primary === null) primary = JSON.stringify(surface);
    expect(
      primary === JSON.stringify(surface),
      `Fixed primary for ${cause}`,
    ).toBe(true);
    expect(
      !document.body.textContent?.includes(seed.name) &&
        control.materialReads === 0,
    ).toBe(true);
    view.unmount();
  }
  expect(control.courseReads).toBe(4);
  courseUnitCheckpoint("learn-hidden");
});

it("Learn metadata pagination is explicit and dependent denial clears course and entire shell", async () => {
  const { control, seed } = backend();
  mount(`${path}/materials`);
  await ready("Course materials");
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Next" }) !== null).toBe(true),
  );
  expect(
    control.offsets.join() === "0" &&
      !document.body.textContent?.includes(seed.teachingText) &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  const collectionTime = () =>
    document.querySelector("h2[tabindex]")?.nextElementSibling?.textContent;
  const previousTime = collectionTime();
  vi.setSystemTime(new Date(Date.now() + 60_000));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(control.offsets.join()).toBe("0,25"));
  await waitFor(() =>
    expect(
      screen.queryByText(
        "No approved course material metadata on this page.",
      ) !== null,
    ).toBe(true),
  );
  expect(document.activeElement?.tagName).toBe("H2");
  expect(previousTime !== collectionTime()).toBe(true);
  control.materialDeny = true;
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  await ready("Course access unavailable");
  expect(
    !document.body.textContent?.includes(seed.name) &&
      screen.queryByRole("navigation", { name: "Application navigation" }) ===
        null,
  ).toBe(true);
  courseUnitCheckpoint("learn-page-denial");
});

it("Learn lifecycle fences delayed course truth and return issues no read until explicit Refresh", async () => {
  const { control, seed } = backend();
  let release = () => {};
  control.holdCourse = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  try {
    await waitFor(() => expect(control.courseReads).toBe(1));
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      ),
    );
    await act(async () => release());
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    expect(
      control.capabilityReads === 1 &&
        control.materialReads === 0 &&
        !document.body.textContent?.includes(seed.name),
    ).toBe(true);
    control.holdCourse = null;
    control.ids = [];
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await ready("Course access unavailable");
    expect(
      control.courseReads === 1 &&
        control.materialReads === 0 &&
        control.capabilityReads === 2,
    ).toBe(true);
    courseUnitCheckpoint("learn-lifecycle");
  } finally {
    release();
  }
});

it("Learn fresh revalidation rediscovers membership and never interprets read failure as empty", async () => {
  const { control, seed } = backend();
  control.fail = true;
  mount();
  await ready("Course access unavailable");
  expect(
    screen.queryByRole("button", { name: "Check again" }) !== null &&
      control.materialReads === 0,
  ).toBe(true);
  control.fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Check again" }));
  await ready();
  await waitFor(() =>
    expect(document.body.textContent?.includes(seed.name)).toBe(true),
  );
  expect(
    document.body.textContent?.includes(seed.name) &&
      screen.queryByText("Not accepting new sessions") !== null,
  ).toBe(true);
  control.ids = [];
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await ready("Course access unavailable");
  expect(
    !document.body.textContent?.includes(seed.name) &&
      control.courseReads === 2 &&
      control.materialReads === 1,
  ).toBe(true);
  courseUnitCheckpoint("learn-revalidation");
});
