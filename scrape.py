"""Scrape visa-bulletin.us employment-based chart data for all chargeability areas.

Usage: uv run scrape.py [out_dir]
Writes <out_dir>/meta.json and <out_dir>/<country>_<table>.json — one file per
artifact db document (collection "bulletin"), plus <out_dir>/all.json for embedding.
"""
import json, os, re, sys, time, urllib.request

COUNTRIES = {"row": (1, "All Chargeability"), "china": (2, "China"), "india": (3, "India"),
             "mexico": (4, "Mexico"), "philippines": (5, "Philippines"),
             "centralam": (6, "El Salvador / Guatemala / Honduras")}
TABLES = ["filing", "final_action"]
URL = "https://visa-bulletin.us/?category=employment_based&country={c}&action_type={t}"
PREVIOUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "data.json")
MONTH = re.compile(r"\d{4}-\d{2}")
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def fetch(c, t):
    req = urllib.request.Request(URL.format(c=c, t=t), headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode()
    i = html.index("chartData = ") + len("chartData = ")
    data, _ = json.JSONDecoder().raw_decode(html[i:])
    out = {}
    for tr in data["data"]:
        name = str(tr.get("name", ""))
        if name.startswith("Your Priority Date"):
            continue
        # The page renders these values, so keep only well-formed months and dates.
        pts = [(str(x)[:7], str(y)[:10] if y else None) for x, y in zip(tr.get("x", []), tr.get("y", []))]
        pts = [(m, d if d and DATE.fullmatch(d) else None) for m, d in pts if MONTH.fullmatch(m)]
        out[name] = {"m": [m for m, _ in pts], "d": [d for _, d in pts]}
    series = [{"n": n, **v} for n, v in out.items()]
    if not any(s["m"] for s in series):
        raise ValueError("no chart data")
    return series


def fetch_or_keep(key, c, t, previous):
    """Two tries; after that keep the last published data for this chart."""
    for attempt in range(2):
        try:
            return fetch(c, t)
        except Exception as e:
            print(f"warning: {key} {t} attempt {attempt + 1}: {e}", file=sys.stderr)
            time.sleep(5)
    kept = previous.get(key, {}).get(t)
    if kept is None:
        raise RuntimeError(f"{key} {t}: fetch failed and no previous data")
    print(f"warning: {key} {t}: keeping previous data", file=sys.stderr)
    return kept


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "db"
    os.makedirs(out_dir, exist_ok=True)
    fetched = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    everything, latest = {}, ""
    previous = json.load(open(PREVIOUS))["countries"] if os.path.exists(PREVIOUS) else {}
    for key, (cid, label) in COUNTRIES.items():
        everything[key] = {"label": label}
        for t in TABLES:
            series = fetch_or_keep(key, cid, t, previous)
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
