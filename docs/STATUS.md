# Status

The pilot is being built from `docs/PLAN.md`. Done so far: Phases 1 to 3.

## What's built

- `backend/`: FastAPI on SQLite. `uv run -m backend.seed` loads the claims queue, the policies and the customers from `data/`, and the backend seeds a new database on its first start. The database is `backend/undercover.db`, or the file in `UNDERCOVER_DB`.
  - Read operations: `list_claims`, `get_claim`, `get_policy`, `get_customer` (name and claim history, no contact details), `get_policy_wording` and `get_instructions`.
  - The claim workflow: `start_claim`, `add_step`, `list_steps`, `record_decision` and `pay_claim`. A claim goes from waiting to in progress, then to decided, or to waiting for sign-off when it's approved over $1,000.
  - The sign-off rule: `pay_claim` refuses any amount over $1,000 with a 403, and refuses with a 409 an amount that isn't the approved payout, a second payment or a claim that isn't approved.
  - `backend/instructions.md`: the agent's instructions, served by `get_instructions`.
- `agent/`: the UnderCover Agent, LangChain's `create_agent` on OpenRouter (`openai/gpt-6-luna` at low effort, or `MODEL_NAME`). Its six tools each wrap one API operation of the same name, and a refused call comes back to the model as text. `run(claim_id, thread_id)` starts the claim, fetches the instructions and posts each step to the backend as it happens.
- `dashboard/`: still the skeleton page that shows whether the backend is up.

## How to run it

- `npm run dev` starts the backend on port 8000 and the dashboard on port 5173.
- `uv run -m agent` works every waiting claim; `uv run -m agent CLM-1001` works just the claims you name. The backend must be running.
- `uv run -m backend.seed` resets the queue.
- `npm run check` runs every check.
