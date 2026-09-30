"""Scrape visa-bulletin.us employment-based chart data for all chargeability areas.

Usage: uv run scrape.py [out_dir]
Writes <out_dir>/meta.json and <out_dir>/<country>_<table>.json — one file per
artifact db document (collection "bulletin"), plus <out_dir>/all.json for embedding.
"""
import os
import json, sys, time, urllib.request

COUNTRIES = {"row": (1, "All Chargeability"), "china": (2, "China"), "india": (3, "India"),
             "mexico": (4, "Mexico"), "philippines": (5, "Philippines"),
             "centralam": (6, "El Salvador / Guatemala / Honduras")}
TABLES = ["filing", "final_action"]
URL = "https://visa-bulletin.us/?category=employment_based&country={c}&action_type={t}"

def fetch(c, t):
    req = urllib.request.Request(URL.format(c=c, t=t), headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode()
    i = html.index("chartData = ") + len("chartData = ")
    data, _ = json.JSONDecoder().raw_decode(html[i:])
    out = {}
    for tr in data["data"]:
        name = tr.get("name", "")
        if name.startswith("Your Priority Date"):
            continue
        out[name] = {"m": [x[:7] for x in tr["x"]], "d": [str(y)[:10] if y else None for y in tr["y"]]}
    return [{"n": n, **v} for n, v in out.items()]

def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "db"
    os.makedirs(out_dir, exist_ok=True)
    fetched = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    everything, latest = {}, ""
    for key, (cid, label) in COUNTRIES.items():
        everything[key] = {"label": label}
        for t in TABLES:
            series = fetch(cid, t)
            for s in series:
                if "Queue Model" not in s["n"] and s["m"]:
                    latest = max(latest, s["m"][-1])
            doc = {"country": key, "label": label, "table": t, "series": series}
            json.dump(doc, open(f"{out_dir}/{key}_{t}.json", "w"), separators=(",", ":"))
            everything[key][t] = series
            print(key, t, len(series), "series", file=sys.stderr)
    meta = {"latest_bulletin": latest, "fetched_at": fetched,
            "source": "https://visa-bulletin.us/employment-based/"}
    json.dump(meta, open(f"{out_dir}/meta.json", "w"))
    json.dump({**meta, "countries": everything}, open(f"{out_dir}/all.json", "w"), separators=(",", ":"))
    print(out_dir, "latest bulletin", latest, file=sys.stderr)

if __name__ == "__main__":
    main()
