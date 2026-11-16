import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { QueuePage } from "./QueuePage";
import { stubApi, SUMMARIES } from "./testing";
import { POLL_MS } from "./usePolling";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderQueue() {
  render(
    <MemoryRouter>
      <QueuePage />
    </MemoryRouter>,
  );
}

it("lists the claims with their status, decision and payout", async () => {
  stubApi({ "/api/claims": SUMMARIES });
  renderQueue();
  const row = (await screen.findByRole("link", { name: "CLM-1002" })).closest(
    "tr",
  );
  if (!row) throw new Error("CLM-1002 has no row");
  const cells = within(row);
  expect(cells.getByText("Tom Becker")).toBeDefined();
  expect(cells.getByText("Baggage")).toBeDefined();
  expect(cells.getByText("Jul 2, 2026")).toBeDefined();
  expect(cells.getByText("Waiting for sign-off")).toBeDefined();
  expect(cells.getByText("Approved")).toBeDefined();
  expect(cells.getAllByText("$1,150.00")).toHaveLength(2);
  expect(screen.getAllByRole("row")).toHaveLength(4);
  expect(
    screen.getByRole("link", { name: "CLM-1001" }).getAttribute("href"),
  ).toBe("/claims/CLM-1001");
});

it("counts the claims in each status", async () => {
  stubApi({ "/api/claims": SUMMARIES });
  renderQueue();
  const counts = within(
    await screen.findByRole("region", { name: "Claims by status" }),
  );
  for (const label of [
    "Waiting",
    "In progress",
    "Waiting for sign-off",
    "Decided",
  ]) {
    expect(counts.getByText(label)).toBeDefined();
  }
  expect(
    counts.getAllByText(/^\d+$/).map((count) => count.textContent),
  ).toEqual(["1", "0", "1", "1"]);
});

it("says when the backend is not responding", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  renderQueue();
  expect(
    await screen.findByText("The backend is not responding."),
  ).toBeDefined();
});

it("refreshes every two seconds", async () => {
  vi.useFakeTimers();
  const fetch = stubApi({ "/api/claims": SUMMARIES });
  renderQueue();
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(POLL_MS);
  expect(fetch).toHaveBeenCalledTimes(2);
});
