#!/usr/bin/env python3
"""Merge words_A..E into data/words.json: dedupe, rank by tier, interleave word types, keep 1000."""
import json, re, pathlib, collections
D = pathlib.Path(__file__).parent / "data"
GROUP = {"A": "function", "B": "verb", "C": "describe", "D": "thing", "E": "idea"}
src = {k: json.load(open(D / f"words_{k}.json")) for k in GROUP}
seen, pools = set(), collections.defaultdict(list)
KANJI = re.compile(r"[一-鿿]")
problems = []
for k in "ABCDE":
    for e in src[k]:
        key = e["w"]
        if key in seen: continue
        seen.add(key)
        e["g"] = GROUP[k]
        if len(e.get("ex", [])) < 2: problems.append(("ex", e["w"])); continue
        for x in e["ex"]:
            if KANJI.search(x.get("rd", "")): problems.append(("kanji-in-rd", e["w"], x["rd"]))
        pools[(int(e.get("t", 3)), k)].append(e)
out = []
for tier in range(1, 6):
    queues = {k: list(pools[(tier, k)]) for k in "ABCDE"}
    total = sum(len(q) for q in queues.values())
    # weighted round-robin so each stretch mixes types proportionally
    credit = {k: 0.0 for k in queues}
    while any(queues.values()):
        for k, q in queues.items():
            if q: credit[k] += len(pools[(tier, k)]) / total
        k = max((k for k in queues if queues[k]), key=lambda k: credit[k])
        credit[k] -= 1
        out.append(queues[k].pop(0))
out = out[:1000]
for i, e in enumerate(out): e["id"] = i
json.dump(out, open(D / "words.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("unique", len(seen), "kept", len(out))
print(collections.Counter(e["g"] for e in out), collections.Counter(e["t"] for e in out))
print("problems", len(problems), problems[:8])
