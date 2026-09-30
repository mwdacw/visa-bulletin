"""Build the static site in docs/ from the page templates and the latest scrape.

Usage: python build.py   (after `python scrape.py db` and `python stats.py`)
docs/data.json is replaced only when the bulletin data itself changed, so a
daily run with no new bulletin leaves the repo untouched.
"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SCRAPED = os.path.join(ROOT, "db", "all.json")
DATA = os.path.join(ROOT, "docs", "data.json")
INDEX = os.path.join(ROOT, "docs", "index.html")
PAGE = os.path.join(ROOT, "page")

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def main():
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    current = json.loads(read(DATA)) if os.path.exists(DATA) else None
    if os.path.exists(SCRAPED):
        fresh = json.loads(read(SCRAPED))
        if current is None or fresh["countries"] != current["countries"]:
            with open(DATA, "w", encoding="utf-8") as f:
                json.dump(fresh, f, separators=(",", ":"))
            current = fresh
            print("data changed:", fresh["latest_bulletin"])
        else:
            print("data unchanged:", current["latest_bulletin"])
    base = json.dumps(current, separators=(",", ":"))
    stats_path = os.path.join(ROOT, "docs", "stats.json")
    stats = read(stats_path) if os.path.exists(stats_path) else "null"
    aos_path = os.path.join(ROOT, "docs", "aos_charts.json")
    aos = json.dumps(json.loads(read(aos_path)), separators=(",", ":")) if os.path.exists(aos_path) else "null"
    html = (read(os.path.join(PAGE, "head_en.html")) + read(os.path.join(PAGE, "body_en.html"))
            + "<script>\nconst BASE=" + base + ";\nconst STATS0=" + stats.strip() + ";\nconst AOS0=" + aos + ";\n"
            + read(os.path.join(PAGE, "app_en.js")) + "\n" + read(os.path.join(PAGE, "filings_en.js")) + "</script>\n")
    # The Artifact publisher adds its own skeleton; a plain website needs one.
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
           '<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
           '</head><body>' + html + '</body></html>\n')
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(doc)

if __name__ == "__main__":
    main()
