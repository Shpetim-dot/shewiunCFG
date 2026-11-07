"""Evaluate stored research reports with Ragas (optional dependency).

Usage:
    python tools/ragas_eval.py --db path/to/cfa.db [--limit 5]

Ragas is not bundled. Install it with `pip install ragas datasets` and configure a model key;
without it the script explains what is missing and exits with code 2. It never invents scores:
each report is scored against its own sources, which is exactly the citation contract this
product promises.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys


def load_reports(db: str, limit: int) -> list[dict]:
    con = sqlite3.connect(db)
    rows = con.execute("SELECT id, question, report FROM research ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    out = []
    for rid, question, payload in rows:
        try:
            data = json.loads(payload or "{}")
        except ValueError:
            continue
        if data.get("markdown") and data.get("sources"):
            out.append({"id": rid, "question": question, "report": data})
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--limit", type=int, default=5)
    args = ap.parse_args()
    reports = load_reports(args.db, args.limit)
    if not reports:
        print("no stored reports with markdown and sources found in this database")
        return 1
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import faithfulness
    except ImportError:
        print("Ragas is not installed. Install it with: pip install ragas datasets")
        print(f"{len(reports)} report(s) are ready to evaluate in this database.")
        return 2
    data = {"question": [r["question"] for r in reports],
            "answer": [r["report"]["markdown"] for r in reports],
            "contexts": [[(s.get("snippet") or "") for s in r["report"]["sources"]] for r in reports]}
    result = evaluate(Dataset.from_dict(data), metrics=[faithfulness])
    print(json.dumps({"faithfulness": float(result["faithfulness"]), "reports": len(reports)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
