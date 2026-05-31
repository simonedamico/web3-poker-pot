import { expect, it } from "vitest";

it("loads the jsdom test environment", () => {
  expect(document.body).toBeTruthy();
});
