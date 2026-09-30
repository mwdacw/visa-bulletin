"""Collect USCIS and DOL filing/approval statistics into docs/stats.json.

Usage: uv run --with openpyxl --with pypdf stats.py

USCIS: the Immigration and Citizenship Data page lists only the newest quarter's
files, so every run discovers those links, parses any file not seen before and
merges it into the existing history (older quarters come from BACKFILL).
DOL: dol.gov refuses scripted downloads, so PERM figures come from the Selected
Statistics PDFs kept in data/perm_pdfs/ (add a new quarter's PDF there by hand).
"""
import glob, io, json, os, re, sys, time, urllib.request

import openpyxl
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "docs", "stats.json")
PERM_DIR = os.path.join(ROOT, "data", "perm_pdfs")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
DATA_PAGE = "https://www.uscis.gov/tools/reports-and-studies/immigration-and-citizenship-data"
U = "https://www.uscis.gov/sites/default/files/document/data/"
BACKFILL = [U + f for f in [
    "I-140_FY22_Q4.pdf", "i-140_fy23_q4.pdf", "i140_fy2024_q4.xlsx", "i140_fy2025_q4_v1.xlsx",
    "eb_i140_i360_i526_performancedata_fy2024_q1.xlsx", "eb_i140_i360_i526_performancedata_fy2024_q3.xlsx",
    "eb_i140_i360_i526_performancedata_fy2024_q4.xlsx", "eb_i140_i360_i526_performancedata_fy2025_q1.xlsx",
    "eb_i140_i360_i526_performancedata_fy2025_q2.xlsx", "eb_i140_i360_i526_performancedata_fy2025_q3.xlsx",
    "eb_i140_i360_i526_performancedata_fy2026_q2_v1.xlsx",
    "i485_performance_data_fy2025_q4_v1.xlsx", "i485_performance_data_fy2026_q2_v1.xlsx",
]]
# Which report a file is, from its name.
KINDS = [
    ("awaiting", re.compile(r"eb_i140_i360_i526_performancedata_fy(\d{4})_q(\d)", re.I)),
    ("country", re.compile(r"i140_rec_by_class_country_fy(\d{4})_?\s*(?:%20)?q(\d)", re.I)),
    ("i485", re.compile(r"i485_performance_data_fy(\d{4})_q(\d)", re.I)),
    ("i140", re.compile(r"i-?140_fy(\d{2}|\d{4})_q(\d)", re.I)),
]
I140_ROWS = [
    ("TOTAL", r"^TOTAL\b"), ("EB1", r"First Preference \(EB1\)"), ("E11", r"\(E11\)"), ("E12", r"\(E12\)"),
    ("E13", r"\(E13\)"), ("EB2", r"Second Preference \(EB2\)"), ("E21", r"\(E21\)"),
    ("NIW", r"National Interest Waiver"), ("EB3", r"Third Preference \(EB3\)"), ("E31", r"\(E31\)"),
    ("E32", r"\(E32\)"), ("EW3", r"\(EW3\)"),
]
MONTHS = {m: i + 1 for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July",
                                          "August", "September", "October", "November", "December"])}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read()


def num(v):
    if v is None or v == "-" or v == "--":
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    return int(str(v).replace(",", "").strip() or 0)


def classify(url):
    name = url.rsplit("/", 1)[-1]
    for kind, rx in KINDS:
        m = rx.search(name)
        if m:
            fy = int(m.group(1))
            return kind, (fy + 2000 if fy < 100 else fy), int(m.group(2))
    return None, None, None


def rows_of(blob):
    ws = openpyxl.load_workbook(io.BytesIO(blob), data_only=True, read_only=True).worksheets
    return [[list(r) for r in s.iter_rows(values_only=True)] for s in ws], [s.title for s in ws]


def parse_i140(blob, fy, is_pdf):
    """Per-quarter received/approved/denied/pending for one fiscal year."""
    found = {}
    if is_pdf:
        text = " ".join(p.extract_text() for p in PdfReader(io.BytesIO(blob)).pages)
        text = re.sub(r"\s+", " ", text)
        body = text[text.index("Pending"):]  # skip the title block
        for key, pat in I140_ROWS:
            m = re.search(pat.replace("^", r"(?<![A-Za-z])"), body)
            if not m:
                continue
            nums = re.findall(r"(?<![\w(])(\d{1,3}(?:,\d{3})*|-)(?![\w)])", body[m.end():m.end() + 600])
            if len(nums) >= 16:
                found[key] = [num(x) for x in nums[:16]]
    else:
        sheets, _ = rows_of(blob)
        for r in sheets[0]:
            label = str(r[0] or "").strip()
            for key, pat in I140_ROWS:
                if key not in found and re.search(pat, label):
                    found[key] = [num(x) for x in r[1:17]]
    out = {}
    for q in range(4):
        row = {k: v[q * 4:q * 4 + 4] for k, v in found.items()}
        if row.get("TOTAL") and any(row["TOTAL"]):
            out[f"FY{fy}Q{q + 1}"] = row
    return out


def parse_country(blob):
    """I-140 receipts by fiscal year received and current status, per country of birth."""
    sheets, titles = rows_of(blob)
    res = {"countries": {}}
    for rows, title in zip(sheets, titles):
        key = re.sub(r"\s*(FY)?\s*20\d\d$|\s*FY\d\d$", "", title.strip()).lower()
        key = "all" if key.startswith("all") else key.replace(" ", "_")
        c, sec, sub = {}, "ALL", False
        for r in rows:
            label = str(r[0] or "").strip()
            if label.startswith("Petitions by Employment"):
                years = [int(v) for v in r[1:] if isinstance(v, (int, float))]
                res["years"] = years
                continue
            if not label or "years" not in res:
                continue
            n = len(res["years"])
            vals = [num(v) for v in r[1:1 + n]]
            m = re.search(r"\((EB[123])\)", label)
            if m:
                sec, sub = m.group(1), False
                continue
            if label.startswith("Approvals by Category"):
                sub = True
                continue
            if sub:
                code = re.search(r"\((E\d\d|EW3)\)", label)
                code = code.group(1) if code else ("NIW" if "National Interest" in label else None)
                if code:
                    c.setdefault(sec, {}).setdefault("sub", {})[code] = vals
                continue
            field = {"TOTAL": "total", "Total Petitions": "total", "Approved": "approved",
                     "Denied": "denied"}.get(label) or ("pending" if label.startswith("Pending") else None)
            if field:
                c.setdefault(sec, {})[field] = vals
        if c:
            res["countries"][key] = c
    return res


def parse_awaiting(blob):
    """Approved EB petitions awaiting a visa, by preference and country of birth."""
    sheets, _ = rows_of(blob)
    rows = sheets[0]
    as_of, cols, out = None, None, {}
    for r in rows:
        label = str(r[0] or "").strip()
        m = re.match(r"As of (\w+) (\d{4})", label)
        if m:
            as_of = f"{m.group(2)}-{MONTHS[m.group(1)]:02d}"
        elif label == "Country":
            cols = []
            for h in r[1:]:
                h = re.sub(r"\s+", " ", str(h or ""))
                cols.append("eb1" if h.startswith("1st") else "eb2" if h.startswith("2nd") else
                            "eb3" if "Professional and Skilled" in h else "eb3o" if "3rd (Other" in h else
                            "eb4" if "Special" in h else "eb4r" if "Religious" in h else
                            "eb5u" if "Unreserved" in h else "eb5s" if "Set Aside" in h else
                            "total" if h == "TOTAL" else None)
        elif cols and label.startswith("Table Key"):
            break
        elif cols and label:
            key = {"TOTAL": "total", "Rest of the World": "row"}.get(label, label.lower())
            out[key] = {c: num(v) for c, v in zip(cols, r[1:]) if c}
    return as_of, out


def parse_i485(blob):
    sheets, _ = rows_of(blob)
    rows = sheets[0]
    period = str(rows[2][0] or "").strip()
    eb_col = None
    for r in rows[:8]:
        for i, v in enumerate(r):
            if v and str(v).startswith("Employment-based"):
                eb_col = i
    for r in rows:
        if str(r[0] or "").strip() == "Total":
            fam = [num(v) for v in r[2:6]]
            eb = [num(v) for v in r[eb_col:eb_col + 4]]
            return {"period": period, "eb": eb, "family": fam}
    return None


def parse_perm(path):
    text = re.sub(r"\s+", " ", " ".join(p.extract_text() for p in PdfReader(path).pages))
    fy = int(re.search(r"Fiscal Year \(FY\) (\d{4})", text).group(1))
    m = re.search(r"Data as of (\w+) (\d+), (\d{4})", text)
    as_of = f"{m.group(3)}-{MONTHS[m.group(1)]:02d}-{int(m.group(2)):02d}"
    tok = r"(\d{1,3}(?:,\d{3})*|--)"
    rec = re.search(r"% Change (?:from )?FY ?20\d\d " + r" ".join([tok] * 5), text)
    rows = {"received": [num(x) for x in rec.groups()[1:]]}  # groups: FY total, Q1..Q4
    for action in ["Certified", "Denied", "Withdrawn"]:
        m = re.search(action + r" " + r" ".join([tok] * 5), text)
        rows[action.lower()] = [num(x) for x in m.groups()[1:]]
    remaining = sum(num(x) for x in re.findall(r"([\d,]+) applications remaining", text))
    quarters = {}
    for q in range(4):
        vals = {k: v[q] for k, v in rows.items()}
        if any(vals.values()):
            quarters[f"FY{fy}Q{q + 1}"] = vals
    return quarters, as_of, remaining


def discover():
    try:
        html = get(DATA_PAGE).decode("utf-8", "replace")
    except Exception as e:
        print("warning: USCIS data page:", e, file=sys.stderr)
        return []
    links = set()
    for href in re.findall(r'href="([^"]+\.(?:xlsx|pdf))"', html, re.I):
        url = href if href.startswith("http") else "https://www.uscis.gov" + href
        if classify(url)[0]:
            links.add(url)
    return sorted(links)


def main():
    stats = json.load(open(OUT)) if os.path.exists(OUT) else {}
    for k, v in [("i140_quarterly", {}), ("awaiting", {}), ("i485", {}), ("sources", [])]:
        stats.setdefault(k, v)
    changed = False
    for url in BACKFILL + discover():
        if url in stats["sources"]:
            continue
        kind, fy, q = classify(url)
        try:
            blob = get(url)
            if kind == "i140":
                stats["i140_quarterly"].update(parse_i140(blob, fy, url.lower().endswith(".pdf")))
            elif kind == "country":
                if (fy, q) >= tuple(stats.get("i140_country", {}).get("fyq", (0, 0))):
                    stats["i140_country"] = {**parse_country(blob), "fyq": [fy, q], "label": f"FY{fy} Q{q}"}
            elif kind == "awaiting":
                as_of, rows = parse_awaiting(blob)
                stats["awaiting"][as_of] = rows
            elif kind == "i485":
                stats["i485"][f"FY{fy}Q{q}"] = parse_i485(blob)
        except Exception as e:  # keep going; a malformed file must not wipe the history
            print(f"warning: {url}: {e}", file=sys.stderr)
            continue
        stats["sources"].append(url)
        changed = True
        print("parsed", kind, url.rsplit("/", 1)[-1], file=sys.stderr)
    perm, remaining = {}, {}
    for path in sorted(glob.glob(os.path.join(PERM_DIR, "*.pdf"))):
        quarters, as_of, rem = parse_perm(path)
        perm.update(quarters)
        remaining[as_of] = rem
    new_perm = {"quarterly": perm, "remaining": remaining}
    if new_perm != stats.get("perm"):
        stats["perm"] = new_perm
        changed = True
    for k in ["i140_quarterly", "awaiting", "i485"]:
        stats[k] = dict(sorted(stats[k].items()))
    if changed or "updated_at" not in stats:
        stats["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, "w") as f:
            json.dump(stats, f, separators=(",", ":"))
        print("stats updated", file=sys.stderr)
    else:
        print("stats unchanged", file=sys.stderr)


if __name__ == "__main__":
    main()
