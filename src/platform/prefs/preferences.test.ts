import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTextSize,
  readStoredLocale,
  readTextSize,
  setTextSize,
  storeLocale,
} from "./preferences";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.className = "";
});

describe("device-local preferences", () => {
  it("rejects an invalid stored text size", () => {
    localStorage.setItem("mia.interface.text-size", "huge");
    expect(readTextSize()).toBe("standard");
  });

  it("keeps preferences operable when storage reads and writes fail", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(readStoredLocale()).toBeNull();
    expect(readTextSize()).toBe("standard");
    expect(() => storeLocale("fr-FR")).not.toThrow();
    expect(() => setTextSize("large")).not.toThrow();
    expect(document.documentElement).toHaveClass("text-lg");
  });

  it("replaces, rather than accumulates, root text-size classes", () => {
    applyTextSize("large");
    applyTextSize("extra-large");
    expect(document.documentElement).toHaveClass("text-xl");
    expect(document.documentElement).not.toHaveClass("text-lg");
  });
});
