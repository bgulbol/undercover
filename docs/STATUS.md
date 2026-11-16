# Status

The pilot is built: all six phases of `docs/PLAN.md`.

## What's built

- `backend/`: FastAPI on SQLite. `uv run -m backend.seed` loads the claims queue, the policies and the customers from `data/`, and the backend seeds a new database on its first start. The database is `backend/undercover.db`, or the file in `UNDERCOVER_DB`. Every operation has an `operation_id`, a one-line docstring and no optional inputs, and a test enforces it.
  - Read operations: `list_claims`, `get_claim`, `get_policy`, `get_customer` (name and claim history, no contact details), `get_policy_wording` and `get_instructions`.
  - The claim workflow: `start_claim`, `add_step`, `list_steps`, `record_decision` and `pay_claim`. A claim goes from waiting to in progress, then to decided, or to waiting for sign-off when it's approved over $1,000.
  - The sign-off rule: `pay_claim` refuses any amount over $1,000 with a 403, and refuses with a 409 an amount that isn't the approved payout, a second payment or a claim that isn't approved. There is no sign-off action yet, so a claim waiting for sign-off stays there.
  - `backend/instructions.md`: the agent's instructions, served by `get_instructions`.
- `agent/`: the UnderCover Agent, LangChain's `create_agent` on OpenRouter (`openai/gpt-6-luna` at low effort, or `MODEL_NAME`). Its six tools each wrap one API operation of the same name, and a refused call comes back to the model as text. `run(claim_id, thread_id)` starts the claim, fetches the instructions and posts each step to the backend as it happens. It works from the policy wording alone and never sees `data/evals/`.
- `dashboard/`: React with React Router, in the brand's fonts and colors, in light and dark mode. Three pages:
  - The queue: a count for each status, and every claim with its status, decision and payout. It refreshes every 2 seconds.
  - A claim: the decision with its reason, policy section and payment; the customer's story, items and documents; the policy; the claim history; and the agent's steps as a live timeline, each with a plain label and its details.
  - The agent's instructions, read only.
- `e2e/`: Playwright runs its own backend on port 8001, on `e2e/e2e.db` reseeded every run, and its own dashboard on port 5174, so the tests never touch the dev queue. A stand-in agent drives the API, so no test calls a model.

## How to run it

- `npm run dev` starts the backend on port 8000 and the dashboard at http://localhost:5173.
- `uv run -m agent` works every waiting claim; `uv run -m agent CLM-1001` works just the claims you name. The backend must be running. Open a claim in the dashboard to watch the agent's steps as it works.
- `uv run -m backend.seed` resets the queue.
- `npm run check` runs every check.
