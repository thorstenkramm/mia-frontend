import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the public scaffold and build identifier", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "MIA scaffold" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("MIA scaffold | MIA");
    expect(screen.getByTestId("build-identifier")).toHaveTextContent(
      /^Build \d+\.\d+\.\d+\+/,
    );
  });
});
