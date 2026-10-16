import { Blob as ByteBlob } from "node:buffer";
import { waitFor } from "@testing-library/react";
import { http } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { server } from "../../../test/server";
import {
  authenticatedSessionResponse,
  ownProfileCapabilities,
} from "../../../test/mfaFixtures";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import { SessionController } from "../session/sessionController";
import { toMaterialId } from "../api/entry";
import { jsonApiMediaType } from "../api/client";
import { MaterialUpload } from "./materialUpload";

afterEach(() => vi.unstubAllGlobals());
class ControlledXhr extends XMLHttpRequest {
  sends = 0;
  body: FormData | null = null;
  headers = new Map<string, string>();
  outcomeStatus = 201;
  raw: Blob | null = null;
  override open(): void {}
  override send(body?: Document | XMLHttpRequestBodyInit | null): void {
    if (!(body instanceof FormData))
      throw new Error("Expected one multipart body.");
    this.body = body;
    this.sends++;
  }
  override abort(): void {
    this.body = null;
    this.dispatchEvent(new ProgressEvent("abort"));
  }
  override setRequestHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }
  override getResponseHeader(name: string): string | null {
    return name === "Content-Type" ? jsonApiMediaType : null;
  }
  override get status(): number {
    return this.outcomeStatus;
  }
  override get response(): Blob | null {
    return this.raw;
  }
  load(body: string, status = 201) {
    this.outcomeStatus = status;
    this.raw = new Blob([body]);
    this.dispatchEvent(new ProgressEvent("load"));
  }
}
async function admittedTransfer() {
  vi.stubGlobal("Blob", ByteBlob);
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  server.use(
    http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
    http.get("/api/v1/users/me/capabilities", () => ownProfileCapabilities()),
  );
  const controller = new SessionController();
  controller.start();
  await waitFor(() =>
    expect(controller.getSnapshot().kind).toBe("Authenticated"),
  );
  const xhr = new ControlledXhr();
  const transfer = new MaterialUpload(controller, () => xhr);
  const unregister = controller.registerSecurityTeardown(() =>
    transfer.destroy(),
  );
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  return {
    fixture,
    xhr,
    transfer,
    controller,
    id,
    close: () => {
      transfer.destroy();
      unregister();
      controller.stop();
    },
  };
}
it("material transfer sends one multipart file with current CSRF and measured progress", async () => {
  const { fixture, xhr, transfer, id, close } = await admittedTransfer();
  try {
    const states: string[] = [];
    const attempt = transfer.upload(
      id,
      new File([fixture.teachingText], `${fixture.name}.pdf`, {
        type: "application/pdf",
      }),
      () => true,
      (progress) => states.push(progress.kind),
    );
    await waitFor(() => expect(xhr.sends).toBe(1));
    expect(
      xhr.headers.get("X-CSRF-Token") === fixture.csrf &&
        !xhr.headers.has("Content-Type") &&
        [...(xhr.body?.keys() ?? [])].join() === "file",
    ).toBe(true);
    xhr.upload.dispatchEvent(
      new ProgressEvent("progress", {
        lengthComputable: true,
        loaded: 5,
        total: 10,
      }),
    );
    xhr.upload.dispatchEvent(new ProgressEvent("load"));
    xhr.upload.dispatchEvent(
      new ProgressEvent("progress", {
        lengthComputable: true,
        loaded: 5,
        total: 10,
      }),
    );
    expect(states.at(-1)).toBe("Verifying");
    xhr.load(
      JSON.stringify({
        data: {
          type: "material-files",
          id: "file_1",
          attributes: {
            original_filename: `${fixture.name}.pdf`,
            media_type: "application/pdf",
            size_bytes: 10,
            page_count: 1,
            state: "draft",
            failure_code: null,
          },
          relationships: { material: { data: { type: "materials", id } } },
        },
      }),
    );
    const result = await attempt.result;
    expect(
      result.kind === "completed" &&
        result.value.name === `${fixture.name}.pdf` &&
        states.includes("Verifying") &&
        xhr.sends === 1,
    ).toBe(true);
  } finally {
    close();
  }
});
it.each([
  "stop",
  "network",
  "malformed",
  "server",
  "oversized",
  "utf8",
] as const)(
  "material transfer %s settles unknown without replay",
  async (mode) => {
    const { fixture, xhr, transfer, id, close } = await admittedTransfer();
    try {
      const attempt = transfer.upload(
        id,
        new File([fixture.teachingText], `${fixture.name}.pdf`),
        () => true,
        () => undefined,
      );
      await waitFor(() => expect(xhr.sends).toBe(1));
      if (mode === "stop") attempt.stopWaiting();
      else if (mode === "network")
        xhr.dispatchEvent(new ProgressEvent("error"));
      else if (mode === "utf8") {
        xhr.outcomeStatus = 422;
        xhr.raw = new Blob([new Uint8Array([255])]);
        xhr.dispatchEvent(new ProgressEvent("load"));
      } else
        xhr.load(
          mode === "oversized"
            ? "x".repeat(65537)
            : mode === "server"
              ? JSON.stringify({
                  errors: [{ code: "unavailable", detail: fixture.rawError }],
                })
              : "{}",
          mode === "malformed" ? 201 : mode === "oversized" ? 422 : 503,
        );
      const result = await attempt.result;
      expect(
        result.kind === "unknown" &&
          xhr.sends === 1 &&
          xhr.onload === null &&
          xhr.upload.onprogress === null,
      ).toBe(true);
    } finally {
      close();
    }
  },
);
it("material transfer preserves original rejected UTF-8 disclosure and fences security teardown", async () => {
  const { fixture, xhr, transfer, controller, id, close } =
    await admittedTransfer();
  try {
    const attempt = transfer.upload(
      id,
      new File([fixture.teachingText], `${fixture.name}.pdf`),
      () => true,
      () => undefined,
    );
    await waitFor(() => expect(xhr.sends).toBe(1));
    const raw = ` {"errors":[{"code":"material_invalid","detail":"${fixture.rawError}"}]}\n`;
    xhr.load(raw, 422);
    const result = await attempt.result;
    expect(
      result.kind === "rejected" &&
        result.failure.kind === "http" &&
        result.failure.disclosure.body === raw,
    ).toBe(true);
    const pending = transfer.upload(
      id,
      new File([fixture.teachingText], `${fixture.name}.pdf`),
      () => true,
      () => undefined,
    );
    controller.observeLifecycle();
    expect(
      (await pending.result).kind === "superseded" && xhr.sends === 1,
    ).toBe(true);
  } finally {
    close();
  }
});
