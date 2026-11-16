import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { CLAIM, stubApi, SUMMARIES } from "./testing";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

it("shows the queue at the root", async () => {
  stubApi({ "/api/claims": SUMMARIES });
  renderAt("/");
  expect(screen.getByRole("link", { name: "UnderCover" })).toBeDefined();
  expect(screen.getByText("Claims, straight through")).toBeDefined();
  expect(
    await screen.findByRole("heading", { name: "Claims queue" }),
  ).toBeDefined();
});

it("shows a claim at its own path", async () => {
  stubApi({ "/api/claims/CLM-1001": CLAIM });
  renderAt("/claims/CLM-1001");
  expect(
    await screen.findByRole("heading", { name: "Claim CLM-1001" }),
  ).toBeDefined();
});

it("says when a claim does not exist", async () => {
  stubApi({});
  renderAt("/claims/CLM-9999");
  expect(await screen.findByText("There is no claim CLM-9999.")).toBeDefined();
});
