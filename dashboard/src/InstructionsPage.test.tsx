import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InstructionsPage } from "./InstructionsPage";
import { stubApi } from "./testing";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the instructions as read-only text", async () => {
  stubApi({
    "/api/instructions": { text: "# The UnderCover Agent\n\nDecide." },
  });
  render(<InstructionsPage />);
  expect(
    screen.getByRole("heading", { name: "The agent's instructions" }),
  ).toBeDefined();
  expect(await screen.findByText(/# The UnderCover Agent/)).toBeDefined();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("says when the backend is not responding", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<InstructionsPage />);
  expect(
    await screen.findByText("The backend is not responding."),
  ).toBeDefined();
});
