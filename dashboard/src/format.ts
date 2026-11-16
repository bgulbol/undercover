import type { Decision, Status } from "./api";

export type Tone =
  "sea-green" | "marigold" | "coral" | "cerulean" | "raspberry";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const day = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const clock = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });

export function money(amount: number): string {
  return dollars.format(amount);
}

export function date(isoDate: string): string {
  return day.format(new Date(isoDate));
}

export function time(isoDateTime: string): string {
  return clock.format(new Date(isoDateTime));
}

export function sentence(code: string): string {
  const words = code.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ADD_ONS = new Map([
  ["adventure_sports", "Adventure Sports"],
  ["pre_existing_waiver", "Pre-Existing Condition Waiver"],
  ["electronics_plus", "Electronics Plus"],
]);

export function addOn(code: string): string {
  return ADD_ONS.get(code) ?? sentence(code);
}

export const STATUSES: Status[] = [
  "waiting",
  "in_progress",
  "waiting_for_sign_off",
  "decided",
];

export const STATUS_LABELS: Record<Status, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  waiting_for_sign_off: "Waiting for sign-off",
  decided: "Decided",
};

export const STATUS_TONES: Record<Status, Tone> = {
  waiting: "cerulean",
  in_progress: "marigold",
  waiting_for_sign_off: "coral",
  decided: "sea-green",
};

export const DECISION_LABELS: Record<Decision, string> = {
  approve: "Approved",
  decline: "Declined",
  refer: "Referred",
};

export const DECISION_TONES: Record<Decision, Tone> = {
  approve: "sea-green",
  decline: "coral",
  refer: "marigold",
};
