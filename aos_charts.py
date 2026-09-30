"""Which Visa Bulletin chart USCIS told employment-based I-485 filers to use, per month.

Usage: python aos_charts.py
Reads the USCIS "Adjustment of Status Filing Charts" page (current and next month)
plus its monthly archive pages, and writes docs/aos_charts.json:
  {"months": {"2026-10": "filing" | "final_action", ...}, "updated_at": ...}
Archive pages never change, so months already in the file are not fetched again.
"""
import html as H, json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "docs", "aos_charts.json")
PAGE = ("https://www.uscis.gov/green-card/green-card-processes-and-procedures/"
        "visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
MONTHS = {m: i + 1 for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July",
                                          "August", "September", "October", "November", "December"])}
# "For all employment-based preference categories, you must use the Final Action Dates chart ... for May 2026."
RULE = re.compile(r"employment-based[^.]{0,200}?(Dates for Filing|Final Action Dates?)[^.]{0,120}?"
                  r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})", re.I)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")


def text(html):
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", html)))


def rules(page_text):
    """Every (month, chart) statement for employment-based categories on a page."""
    out = {}
    for m in RULE.finditer(page_text):
        chart = "filing" if m.group(1).lower().startswith("dates for filing") else "final_action"
        out[f"{m.group(3)}-{MONTHS[m.group(2).capitalize()]:02d}"] = chart
    return out


TABLE = re.compile(r"Employment-?\s?[Bb]ased\s+All Chargeability")


def table_heading(page_text):
    """Archive pages embed the chart itself; its heading names which one it is."""
    m = TABLE.search(page_text)
    if not m:
        return None
    before = page_text[max(0, m.start() - 300):m.start()]
    hits = [(x.start(), x.group(0)) for x in re.finditer(r"Dates for Filing|Final Action", before, re.I)]
    if not hits:
        return None
    return "filing" if hits[-1][1].lower().startswith("dates for filing") else "final_action"


def vb_date(tok):
    """'01MAR13' -> '2013-03-01', 'C' -> None."""
    m = re.fullmatch(r"(\d{2})([A-Z]{3})(\d{2})", tok)
    if not m:
        return None
    mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].index(m.group(2)) + 1
    return f"20{m.group(3)}-{mon:02d}-{m.group(1)}"


def match_dates(page_text, key):
    """Last resort for pages whose heading doesn't say which chart: compare the
    embedded EB-2/EB-3 dates with the Dates for Filing and Final Action charts
    already scraped into db/all.json (run scrape.py first)."""
    path = os.path.join(ROOT, "db", "all.json")
    m = TABLE.search(page_text)
    if not m or not os.path.exists(path):
        return None
    seg = page_text[m.end():m.end() + 800]
    rows = {}
    for label, nxt in (("2nd", "3rd"), ("3rd", "Other")):
        r = re.search(label + r"\s+(.*?)\s+" + nxt, seg)
        rows[label] = {vb_date(t) for t in r.group(1).split()} if r else set()
    countries = json.load(open(path))["countries"]
    score = {}
    for table in ("filing", "final_action"):
        n = 0
        for c in ("china", "india"):
            for label, name in (("2nd", "EB-2: Professionals with Advanced Degrees"),
                                ("3rd", "EB-3: Skilled Workers, Professionals")):
                s = next((x for x in countries[c][table] if x["n"] == name), None)
                if s and key in s["m"]:
                    d = s["d"][s["m"].index(key)]
                    n += bool(d) and d in rows[label]
        score[table] = n
    if score["filing"] != score["final_action"]:
        return max(score, key=score.get)
    return None


def main():
    data = json.load(open(OUT)) if os.path.exists(OUT) else {"months": {}}
    months = data["months"]
    try:
        main_html = get(PAGE)
    except Exception as e:
        print(f"warning: USCIS filing charts page: {e}; keeping previous data", file=sys.stderr)
        sys.exit(1)
    changed = False
    for k, v in rules(text(main_html)).items():  # current and next month
        if months.get(k) != v:
            months[k], changed = v, True
    # Link text sometimes uses &nbsp; between month and year.
    links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>\s*(January|February|March|April|May|June|July|August|'
                       r'September|October|November|December)(?:\s|&nbsp;)+(\d{4})\s*<', main_html)
    for href, mon, year in links:
        key = f"{year}-{MONTHS[mon]:02d}"
        if key in months:
            continue
        url = href if href.startswith("http") else "https://www.uscis.gov" + href
        url = url.replace("://edit.uscis.gov/", "://www.uscis.gov/")  # some links point at the staff CMS host
        try:
            t = text(get(url))
        except Exception as e:
            print(f"warning: {key}: {e}", file=sys.stderr)
            continue
        chart = rules(t).get(key) or table_heading(t) or match_dates(t, key)
        if chart:
            months[key], changed = chart, True
        else:
            print(f"warning: {key}: no employment-based chart statement found at {url}", file=sys.stderr)
        time.sleep(0.3)
    if changed or "updated_at" not in data:
        data["months"] = dict(sorted(months.items()))
        data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with open(OUT, "w") as f:
            json.dump(data, f, indent=0)
    print(len(months), "months", file=sys.stderr)


if __name__ == "__main__":
    main()
