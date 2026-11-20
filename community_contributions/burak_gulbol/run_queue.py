"""Work the non-manual claims on the model in .env, several at once, and score them.

Scratch script for the week 1 day 4 write-up, not part of the product:
    uv run python community_contributions/burak_gulbol/run_queue.py --workers 6
    uv run python community_contributions/burak_gulbol/run_queue.py --workers 6 --think

It reseeds the queue first, then calls the product's own agent.main.run for each claim,
with a chat model that streams (so a long answer doesn't hit the proxy's time limit)
and turns Qwen's thinking on or off for every request.
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))  # run as a file, Python looks in this folder, not the repo root

from agent.main import api, run  # noqa: E402
labels = {d["claim_id"]: d for d in json.loads((ROOT / "data/evals/decisions.json").read_text(encoding="utf-8"))}

parser = argparse.ArgumentParser()
parser.add_argument("--think", action="store_true", help="turn Qwen's thinking on")
parser.add_argument("--workers", type=int, default=6)
args = parser.parse_args()

subprocess.run([sys.executable, "-m", "backend.seed"], check=True, cwd=ROOT)
claims = [c for c, label in labels.items() if label["difficulty"] != "manual"]

llm = ChatOpenAI(
    model=os.environ["MODEL_NAME"],
    base_url=os.environ["MODEL_BASE_URL"],
    api_key=SecretStr(os.environ.get("MODEL_API_KEY") or "none"),
    streaming=True,
    timeout=900,
    extra_body={"chat_template_kwargs": {"enable_thinking": args.think}},
)


def work(claim_id):
    start = time.time()
    error = ""
    try:
        run(claim_id, f"{claim_id}-{uuid4().hex[:8]}", llm)
    except Exception as e:  # one failed claim shouldn't stop the others
        error = f"{type(e).__name__}: {e}"[:200]
    claim = api("GET", f"/api/claims/{claim_id}")
    label = labels[claim_id]
    right = claim["decision"] == label["decision"] and abs((claim["payout"] or 0) - label["payout"]) <= 1
    row = {
        "claim_id": claim_id, "think": args.think, "decision": claim["decision"], "payout": claim["payout"],
        "paid": claim["paid_amount"], "status": claim["status"], "expected": label["decision"],
        "expected_payout": label["payout"], "decision_right": claim["decision"] == label["decision"],
        "right": right, "seconds": round(time.time() - start), "error": error,
    }
    print(f"{claim_id}: {claim['decision']} ${claim['payout'] or 0:,.0f} (paid {claim['paid_amount']}) "
          f"| expected {label['decision']} ${label['payout']:,.0f} | {'OK' if right else 'WRONG'} | {row['seconds']} s {error}",
          flush=True)
    return row


start = time.time()
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    rows = list(pool.map(work, claims))
total = round(time.time() - start)

out = Path(__file__).with_name("week1day4_product_runs.csv")
with out.open("a", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[*rows[0], "model", "workers", "total_seconds"])
    if f.tell() == 0:
        writer.writeheader()
    for row in rows:
        writer.writerow({**row, "model": os.environ["MODEL_NAME"], "workers": args.workers, "total_seconds": total})

decisions = sum(r["decision_right"] for r in rows)
right = sum(r["right"] for r in rows)
wrongly_paid = sum(1 for r in rows if r["paid"] and r["expected"] != "approve")
print(f"\nthink={args.think}: {decisions}/{len(rows)} decisions right, {right}/{len(rows)} with the payout, "
      f"{wrongly_paid} paid that shouldn't have been, {total} s for all of them with {args.workers} at once")
