import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the create-game view by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Create poker pot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
  });
});
