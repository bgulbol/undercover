# Status

The pilot is being built from `docs/PLAN.md`. Done so far: Phases 1 and 2.

## What's built

- `backend/`: FastAPI on SQLite. `uv run -m backend.seed` loads the claims queue, the policies and the customers from `data/`, and the backend seeds a new database on its first start. The database is `backend/undercover.db`, or the file in `UNDERCOVER_DB`.
  - Read operations: `list_claims`, `get_claim`, `get_policy`, `get_customer` (name and claim history, no contact details) and `get_policy_wording`.
  - The claim workflow: `start_claim`, `add_step`, `list_steps`, `record_decision` and `pay_claim`. A claim goes from waiting to in progress, then to decided, or to waiting for sign-off when it's approved over $1,000.
  - The sign-off rule: `pay_claim` refuses any amount over $1,000 with a 403, and refuses with a 409 an amount that isn't the approved payout, a second payment or a claim that isn't approved.
- `agent/`: still the skeleton, with one tool that calls the health route.
- `dashboard/`: still the skeleton page that shows whether the backend is up.

## How to run it

- `npm run dev` starts the backend on port 8000 and the dashboard on port 5173.
- `uv run -m backend.seed` resets the queue.
- `npm run check` runs every check.
