import { expect, it } from "vitest";
import {
  date,
  DECISION_LABELS,
  money,
  sentence,
  STATUS_LABELS,
  STATUSES,
  time,
} from "./format";

it("formats US dollars", () => {
  expect(money(1250)).toBe("$1,250.00");
  expect(money(0)).toBe("$0.00");
  expect(money(61.5)).toBe("$61.50");
});

it("formats dates without shifting the day", () => {
  expect(date("2026-06-24")).toBe("Jun 24, 2026");
});

it("formats a time of day", () => {
  expect(time("2026-06-24T15:04:05+00:00")).toMatch(/\d{1,2}:\d{2}:\d{2}/);
});

it("labels every status and decision", () => {
  expect(STATUSES.map((status) => STATUS_LABELS[status])).toEqual([
    "Waiting",
    "In progress",
    "Waiting for sign-off",
    "Decided",
  ]);
  expect(Object.values(DECISION_LABELS)).toEqual([
    "Approved",
    "Declined",
    "Referred",
  ]);
});

it("turns codes into labels", () => {
  expect(sentence("trip_delay")).toBe("Trip delay");
  expect(sentence("emergency_medical")).toBe("Emergency medical");
  expect(sentence("baggage_delay")).toBe("Baggage delay");
  expect(sentence("trip_cancellation")).toBe("Trip cancellation");
  expect(sentence("passport")).toBe("Passport");
});
