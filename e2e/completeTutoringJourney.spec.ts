import { expect, test, type Page } from "@playwright/test";
import { journeyScenario } from "./completeTutoringFixtures";
import { fillStudent } from "./studentFixtures";
import { releaseRouteFixture } from "./routeTestFixtures";

test.use({ screenshot: "off", trace: "off", video: "off" });
test.setTimeout(150_000);
const hub = "/prepare/courses/course_1";
const material = `${hub}/materials/material_1`;

async function heading(page: Page, value: string) {
  await expect(
    page.getByRole("heading", { level: 1, name: value }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/\| MIA$/u);
}

test("one synthetic invitation-to-second-tutoring-session journey preserves recovery and scope", async ({
  browser,
}) => {
  const journey = await journeyScenario(browser);
  const { admin, supervisor, student } = journey;
  try {
    // Administrator invitation and in-memory delivery. No email service is
    // called, and the invitation fragment never enters a report or snapshot.
    await admin.goto("/admin/invitations/new");
    await heading(admin, "Invite a supervisor");
    await admin
      .getByLabel("Supervisor’s email address")
      .fill(journey.adminFixture.email);
    await admin.getByRole("button", { name: "Send invitation" }).click();
    await expect(admin.getByText("Delivery queued")).toBeVisible();
    await expect.poll(() => journey.state.invited).toBe(true);

    await supervisor.goto("about:blank");
    await supervisor.goto(
      `/invitation#token=${journey.adminFixture.invitationToken}`,
    );
    await supervisor.getByRole("link", { name: "Accept invitation" }).click();
    await heading(supervisor, "Create your MIA account");
    await supervisor
      .locator("#username")
      .fill(journey.adminFixture.supervisorUsername);
    for (const field of ["new-password", "password-confirmation"])
      await supervisor
        .locator(`#${field}`)
        .fill(journey.supervisorFixture.password);
    await supervisor.locator("#country").selectOption("DE");
    await supervisor.locator("button[type=submit]").click();
    await expect(
      supervisor.getByRole("link", { name: "Sign in" }),
    ).toBeVisible();
    expect(
      journey.state.joined &&
        journey.invitations.invitations[0]?.status === "accepted",
    ).toBe(true);
    await supervisor.goto("/login");
    await supervisor
      .locator("#username")
      .fill(journey.adminFixture.supervisorUsername);
    await supervisor
      .locator("#password")
      .fill(journey.supervisorFixture.password);
    await supervisor.locator("button[type=submit]").click();
    await heading(supervisor, "Home");

    // The candidate exists only after accepted invitation. Creation binds
    // that candidate and the later supervisor reads the same fake course.
    await admin.goto("/admin/courses/new");
    await heading(admin, "Create course");
    await admin.locator("#course-name").fill(journey.adminFixture.courseName);
    await admin.locator("input[type=checkbox]").first().check();
    await admin
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await heading(admin, "Course administration");
    await expect.poll(() => journey.state.courseCreated).toBe(true);
    expect(
      journey.state.courseCreated &&
        journey.adminCourse.validPayload &&
        journey.course.persisted,
    ).toBe(true);
    await supervisor.goto(hub);
    await heading(supervisor, journey.adminFixture.courseName);
    await expect(
      supervisor.getByRole("heading", { name: "Course setup", level: 2 }),
    ).toBeVisible();
    for (const [field, value] of [
      ["learning-goals", journey.supervisorFixture.teachingText],
      ["ai-instructions", journey.supervisorFixture.teachingText],
      ["language", "en"],
    ] as const) {
      await supervisor.goto(`${hub}/${field}`);
      await heading(
        supervisor,
        field === "learning-goals"
          ? "Learning goals"
          : field === "ai-instructions"
            ? "AI instructions"
            : "Course language",
      );
      journey.course.expectedPatch = {
        [field === "learning-goals"
          ? "learning_goals"
          : field === "ai-instructions"
            ? "ai_tutor_instructions"
            : "language"]: value,
      };
      await supervisor.locator("#teaching-field").fill(value);
      await supervisor.getByRole("button", { name: "Save changes" }).click();
      await expect(
        supervisor
          .getByText("Changes saved. The confirmed values are shown.")
          .first(),
      ).toBeVisible();
    }
    expect(journey.course.patches === 3 && journey.course.patchValid).toBe(
      true,
    );
    await supervisor.goto(hub);
    await heading(supervisor, journey.adminFixture.courseName);
    const materialsCard = supervisor
      .locator("main")
      .getByRole("link", { name: /^Course materials\b/u });
    await expect(materialsCard).toHaveAttribute("href", `${hub}/materials`);
    await materialsCard.click();
    await heading(supervisor, "Course materials");
    await supervisor.locator(`main a[href="${hub}/materials/new"]`).click();
    await heading(supervisor, "Create course material");
    await supervisor
      .locator("#material-name")
      .fill(journey.supervisorFixture.courseName);
    await supervisor
      .getByRole("button", { name: "Create course material" })
      .click();
    await heading(supervisor, "Course material files");
    await supervisor.locator("#material-picker").setInputFiles({
      name: `${journey.supervisorFixture.courseName}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(journey.supervisorFixture.teachingText),
    });
    await supervisor
      .getByRole("button", { name: "Queue selected files" })
      .click();
    await supervisor
      .getByRole("button", { name: "Accept authoritative file list" })
      .click();
    await supervisor
      .getByRole("button", { name: "Finalize and process" })
      .click();
    await supervisor
      .getByRole("dialog")
      .getByRole("button", { name: "Finalize and process" })
      .click();
    await heading(supervisor, "Course material processing");
    expect(
      journey.material.creates === 1 &&
        journey.material.validCreate &&
        journey.material.uploads === 1 &&
        journey.material.validMultipart &&
        journey.material.finalizes === 1 &&
        journey.material.lifecycleValid,
    ).toBe(true);
    // Controlled fake provider finishes only after the UI has dispatched its
    // processing request; the student's content is never sent to a provider.
    journey.material.makeReady();
    await supervisor
      .getByRole("button", { name: "Refresh", exact: true })
      .click();
    await supervisor.locator(`a[href="${material}/brief"]`).click();
    await heading(supervisor, "Review material brief");
    await supervisor
      .locator("#brief-summary")
      .fill(`${journey.supervisorFixture.teachingText} corrected`);
    await supervisor
      .getByRole("button", { name: "Save complete brief" })
      .click();
    await supervisor.locator(`a[href="${material}/approval"]`).click();
    await heading(supervisor, "Material approval");
    await supervisor.locator("main input[type=checkbox]").check();
    await supervisor.getByRole("button", { name: "Approve material" }).click();
    await supervisor
      .getByRole("dialog")
      .getByRole("button", { name: "Approve material" })
      .click();
    await expect.poll(() => journey.course.activationEligible).toBe(true);
    expect(
      journey.material.approvals === 1 && journey.material.lifecycleValid,
    ).toBe(true);
    await supervisor.goto(`${hub}/activate`);
    await heading(supervisor, "Activate course");
    await supervisor
      .getByRole("button", { name: "Confirm activation" })
      .click();
    await heading(supervisor, journey.adminFixture.courseName);
    await expect(
      supervisor.getByRole("heading", {
        name: "Active — open for new tutoring sessions",
        level: 2,
      }),
    ).toBeVisible();
    expect(
      journey.course.courseState === "active" && journey.material.approved,
    ).toBe(true);
    const studentsCard = supervisor
      .locator("main")
      .getByRole("link", { name: /^Course students\b/u });
    await expect(studentsCard).toHaveAttribute("href", `${hub}/students`);
    await studentsCard.click();
    await heading(supervisor, "Course students");
    await supervisor.getByRole("link", { name: "Create student" }).click();
    await heading(supervisor, "Create student");
    await fillStudent(supervisor);
    await supervisor
      .getByRole("button", { name: "Create student", exact: true })
      .click();
    await heading(supervisor, "Student membership");
    expect(
      journey.state.studentCreated &&
        journey.roster.valid &&
        journey.roster.posts === 1,
    ).toBe(true);

    await student.goto("/login");
    await student
      .locator("#username")
      .fill(journey.supervisorFixture.supervisorUsername);
    await student.locator("#password").fill(journey.temporary);
    await student.locator("button[type=submit]").click();
    await heading(student, "Choose a new password");
    for (const field of ["new-password", "password-confirmation"])
      await student.locator(`#${field}`).fill(journey.replacement);
    await student.locator("#password-confirmation").press("Enter");
    await heading(student, "Home");
    expect(journey.state.replaced).toBe(true);
    await student.goto("/learn/start");
    await heading(student, "Start a tutoring session");
    await student
      .locator('main a[href="/learn/start/course_1/material"]')
      .first()
      .click();
    await heading(student, "Choose material");
    await student.locator("main input[type=radio]").nth(1).check();
    await student.getByRole("link", { name: "Continue" }).click();
    await heading(student, "Choose how to begin");
    await student
      .getByLabel("Your message to the tutor")
      .fill(journey.studentFixture.teachingText);
    await student.getByRole("button", { name: "Start session" }).click();
    await heading(student, "Tutoring session");
    await expect.poll(() => journey.tutor.messagePosts).toBe(1);
    // Deterministic fake provider enters generating after the first UI send;
    // the browser must consume the existing SSE handler before reconciliation.
    journey.tutor.workGenerating = true;
    await student.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => journey.tutor.streamReads).toBeGreaterThan(0);
    await expect(
      student.locator("#tutoring-current-work-response_gen"),
    ).toContainText("Response in progress");
    expect(
      journey.tutor.starts === 1 &&
        journey.tutor.materialsSent[0] === "material_1" &&
        journey.tutor.requestIds[0] !== journey.tutor.messageRequestIds[0],
    ).toBe(true);

    // The local fake's queued first answer reaches its persisted terminal
    // state asynchronously. A fresh load reads that truth before another send.
    journey.fakeTutor.completeAnswer();
    await student.reload();
    await heading(student, "Tutoring session");
    await expect(student.locator("main article")).toHaveCount(1);
    expect(journey.fakeTutor.savedTurns === 1).toBe(true);

    // The response is deliberately lost *after* the fake receives the next
    // message. Only a deliberate Refresh may reconcile; none is replayed.
    journey.tutor.sendOutcome = "lose";
    journey.tutor.commitOnSend = true;
    await student
      .getByLabel("Your message to the tutor")
      .fill("a follow-up question");
    await student.getByRole("button", { name: "Send" }).click();
    await expect(
      student.getByRole("heading", { name: /message outcome is unknown/u }),
    ).toBeVisible();
    const sent = journey.tutor.messagePosts;
    await expect.poll(() => journey.tutor.messagePosts).toBe(sent);
    const readsBeforeRefresh = journey.tutor.workReads;
    const queryCountBeforeRefresh = journey.tutor.workQueries.length;
    const reconciliationCountBeforeRefresh =
      journey.tutor.reconciliationResults.length;
    const interruptedRequestId = journey.tutor.messageRequestIds.at(-1);
    await student.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect
      .poll(() => journey.tutor.workReads)
      .toBeGreaterThan(readsBeforeRefresh);
    await expect(
      student.getByRole("heading", { name: /message outcome is unknown/u }),
    ).not.toBeVisible();
    expect(
      interruptedRequestId !== undefined &&
        reconciliationCountBeforeRefresh === queryCountBeforeRefresh &&
        journey.tutor.workReads > readsBeforeRefresh &&
        journey.tutor.workQueries.length > queryCountBeforeRefresh &&
        journey.tutor.reconciliationResults.length >
          reconciliationCountBeforeRefresh &&
        journey.tutor.reconciliationResults
          .slice(reconciliationCountBeforeRefresh)
          .some(
            (committed, index) =>
              committed === true &&
              journey.tutor.workQueries[queryCountBeforeRefresh + index] ===
                interruptedRequestId,
          ) &&
        journey.tutor.messagePosts === sent,
    ).toBe(true);
    // Deterministic asynchronous fake terminal work, followed by explicit
    // user recheck and the authoritative persisted transcript read.
    journey.fakeTutor.completeAnswer();
    await student.reload();
    await heading(student, "Tutoring session");
    await expect(
      student.getByRole("link", { name: "Finish session" }),
    ).toBeVisible();
    await student.getByRole("link", { name: "Finish session" }).click();
    await heading(student, "Finish session");
    await student.getByRole("button", { name: "Review Finish" }).click();
    await student.getByRole("button", { name: "Confirm Finish" }).click();
    await heading(student, "Tutoring session");
    await expect(
      student.getByText("This tutoring session is finished."),
    ).toBeVisible();
    expect(
      journey.tutor.finishPosts === 1 &&
        journey.state.firstCompleted &&
        journey.fakeTutor.savedTurns === 2 &&
        journey.fakeTutor.savedReads >= 2 &&
        (await student.locator("main article").count()) === 2,
    ).toBe(true);

    // Separate user's out-of-scope route: admission must not read messages.
    const { page: other, work: otherWork } = await journey.outsider();
    const responseChecks: Promise<boolean>[] = [];
    other.on("response", (response) => {
      if (new URL(response.url()).pathname.startsWith("/api/"))
        responseChecks.push(
          response
            .text()
            .then((body) => body.includes(journey.studentFixture.teachingText)),
        );
    });
    await other.goto("/learn/sessions/session_1");
    await heading(other, "Tutoring access unavailable");
    const safeSurface = async () =>
      other.evaluate(() =>
        JSON.stringify({
          title: document.title,
          copy: document.querySelector("main")?.textContent,
          focus: document.activeElement?.tagName,
          links: Array.from(document.querySelectorAll("main a"), (link) =>
            link.getAttribute("href"),
          ),
          path: location.pathname,
        }),
      );
    const denied = await safeSurface();
    expect(
      otherWork.sessionReads === 1 &&
        otherWork.workReads === 0 &&
        otherWork.turnReads === 0 &&
        !(await other.locator("body").textContent())?.includes(
          journey.studentFixture.teachingText,
        ) &&
        !(await other.locator("body").ariaSnapshot()).includes(
          journey.studentFixture.teachingText,
        ),
    ).toBe(true);
    otherWork.denySession = 404;
    await other.reload();
    await heading(other, "Tutoring access unavailable");
    expect(
      (await safeSurface()) === denied &&
        otherWork.workReads === 0 &&
        otherWork.turnReads === 0,
    ).toBe(true);
    expect((await Promise.all(responseChecks)).every((leaked) => !leaked)).toBe(
      true,
    );
    expect(
      await other.evaluate(
        (protectedText) =>
          !JSON.stringify(Object.entries(localStorage)).includes(
            protectedText,
          ) &&
          !JSON.stringify(Object.entries(sessionStorage)).includes(
            protectedText,
          ) &&
          !JSON.stringify(history.state).includes(protectedText),
        journey.studentFixture.teachingText,
      ),
    ).toBe(true);

    await student
      .locator("main")
      .getByRole("link", { name: "Start a tutoring session" })
      .click();
    await heading(student, "Start a tutoring session");
    await student
      .locator('main a[href="/learn/start/course_1/material"]')
      .first()
      .click();
    await heading(student, "Choose material");
    await student.locator("main input[type=radio]").nth(1).check();
    await student.getByRole("link", { name: "Continue" }).click();
    await heading(student, "Choose how to begin");
    await student
      .getByLabel("Your message to the tutor")
      .fill("second question");
    await student.getByRole("button", { name: "Start session" }).click();
    await expect(student).toHaveURL(/\/learn\/sessions\/session_2$/u);
    await heading(student, "Tutoring session");
    expect(
      journey.state.secondStarts === 1 &&
        journey.state.secondSends === 1 &&
        journey.state.secondStartAttempts === 1 &&
        journey.state.secondSendAttempts === 1 &&
        journey.state.secondStartValid &&
        journey.state.secondSendValid &&
        journey.state.secondStartId !== null &&
        journey.state.secondSendId !== null &&
        journey.state.secondStartId !== journey.tutor.requestIds[0] &&
        journey.state.secondSendId !== journey.state.secondStartId &&
        !journey.tutor.messageRequestIds.includes(journey.state.secondSendId) &&
        journey.tutor.starts === 1 &&
        journey.state.unexpected === 0 &&
        journey.state.external === 0,
    ).toBe(true);
  } finally {
    if (test.info().status !== "timedOut") await journey.close();
    for (const page of [admin, supervisor, student]) releaseRouteFixture(page);
  }
});
